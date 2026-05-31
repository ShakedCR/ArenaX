import { Server, Socket } from "socket.io";
import { blackjackEngine, BlackjackMove, BlackjackGameState, handValue } from "./engine";
import { finalizeMatch, handleTournamentStageEnd } from "./tournament.service";
import { onPlayerAbandoned } from "../socket";
import BlackjackGameStateModel from "./game-state.model";
import Match from "../models/match.model";

const PLAYER_TIMEOUT_MS = 60_000;
const BET_TIMEOUT_MS    = 30_000;
const NEXT_ROUND_DELAY_MS = 7_000;

// ── Timer management ───────────────────────────────────────────────────────────

const playerTimers = new Map<string, NodeJS.Timeout>();

const clearPlayerTimer = (gameId: string, playerId: string): void => {
  const key = `${gameId}:${playerId}`;
  const timer = playerTimers.get(key);
  if (timer) { clearTimeout(timer); playerTimers.delete(key); }
};

const startPlayerTimer = (io: Server, gameId: string, playerId: string, ms = PLAYER_TIMEOUT_MS): void => {
  clearPlayerTimer(gameId, playerId);
  const key = `${gameId}:${playerId}`;
  const timer = setTimeout(() => {
    playerTimers.delete(key);
    io.to(`game:${gameId}`).emit("blackjack:timeout", { gameId, playerId });
    try {
      const state = blackjackEngine.handleTimeout(gameId, playerId);
      void persistState(state, `timeout:${playerId}`).then(async () => {
        // If the timeout auto-placed a bet and all players are now ready, deal cards
        if (state.phase === "betting") {
          const allBetsPlaced = state.playerStates
            .filter(ps => ps.tokens > 0)
            .every(ps => ps.hasBet);
          if (allBetsPlaced) {
            const playingState = blackjackEngine.dealCards(gameId);
            await persistState(playingState, "deal");
            await broadcastState(io, gameId, playingState);
            return;
          }
        }
        await broadcastState(io, gameId, state);
      });
    } catch (err) {
      console.error(`[blackjack] timeout handler error for game=${gameId} player=${playerId}:`, err);
    }
  }, ms);
  playerTimers.set(key, timer);
};

// ── Persistence ────────────────────────────────────────────────────────────────

const restoreGameIfNeeded = async (gameId: string): Promise<void> => {
  try {
    blackjackEngine.getState(gameId);
  } catch {
    const persisted = await BlackjackGameStateModel.findOne({ gameId })
      .select("stateSnapshot").lean() as { stateSnapshot: BlackjackGameState } | null;
    if (persisted?.stateSnapshot) {
      blackjackEngine.restoreGame(gameId, persisted.stateSnapshot);
    }
  }
};

const persistState = async (state: BlackjackGameState, lastAction: string): Promise<void> => {
  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId: state.gameId },
    {
      $set: {
        status: state.isOver ? "completed" : "active",
        stateSnapshot: state,
        leaderboard: blackjackEngine.getLeaderboard(state.gameId),
        lastAction,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// ── State payload builder ──────────────────────────────────────────────────────

const buildStatePayload = (gameId: string, state: BlackjackGameState) => {
  const currentPlayer = state.playerStates[state.currentPlayerIndex];

  const lastRoundResult = state.phase === "round-over"
    ? {
        gameId,
        round: state.currentRound,
        dealerCards: state.dealerCards,
        results: state.playerStates.map(ps => ({
          id: ps.playerId,
          name: ps.name,
          outcome: ps.roundDelta > 0 ? "win" : ps.roundDelta < 0 ? "loss" : "draw",
          delta: ps.roundDelta,
          tokens: ps.tokens,
          hands: ps.hands.map(h => ({
            cards: h.cards,
            bet: h.bet,
            delta: h.roundDelta,
            outcome: h.roundDelta > 0 ? "win" : h.roundDelta < 0 ? "loss" : "draw",
          })),
        })),
        leaderboard: blackjackEngine.getLeaderboard(gameId),
      }
    : null;

  return {
    gameId,
    round: state.currentRound,
    totalRounds: state.totalRounds,
    phase: state.phase,
    dealerCards: state.dealerHidden
      ? [state.dealerCards[0], { rank: "?", suit: "?", value: 0 }]
      : state.dealerCards,
    dealerHidden: state.dealerHidden,
    currentPlayerId: currentPlayer?.playerId ?? null,
    lastRoundResult,
    players: state.playerStates.map(ps => {
      const availableMoves = ps.status === "playing"
        ? blackjackEngine.getAvailableMoves(gameId, ps.playerId)
        : [];
      return {
        id: ps.playerId,
        name: ps.name,
        cards: ps.cards,
        bet: ps.bet,
        tokens: ps.tokens,
        status: ps.status,
        hasBet: ps.hasBet,
        handValue: ps.cards.length > 0 ? handValue(ps.cards) : null,
        availableMoves,
        hands: ps.hands.map(h => ({
          cards: h.cards,
          bet: h.bet,
          status: h.status,
          isDoubled: h.isDoubled,
          isSplit: h.isSplit,
          handValue: h.cards.length > 0 ? handValue(h.cards) : null,
        })),
        activeHandIndex: ps.activeHandIndex,
      };
    }),
  };
};

// ── Broadcast ──────────────────────────────────────────────────────────────────

const broadcastState = async (io: Server, gameId: string, state: BlackjackGameState): Promise<void> => {
  const room = `game:${gameId}`;

  if (state.phase === "round-over") {
    for (const ps of state.playerStates) clearPlayerTimer(gameId, ps.playerId);

    const leaderboard = blackjackEngine.getLeaderboard(gameId);
    const roundResultPayload = {
      gameId,
      round: state.currentRound,
      dealerCards: state.dealerCards,
      players: buildStatePayload(gameId, state).players,
      results: state.playerStates.map(ps => ({
        id: ps.playerId,
        name: ps.name,
        outcome: ps.roundDelta > 0 ? "win" : ps.roundDelta < 0 ? "loss" : "draw",
        delta: ps.roundDelta,
        tokens: ps.tokens,
        hands: ps.hands.map(h => ({
          cards: h.cards,
          bet: h.bet,
          delta: h.roundDelta,
          outcome: h.roundDelta > 0 ? "win" : h.roundDelta < 0 ? "loss" : "draw",
        })),
      })),
      leaderboard,
    };

    io.to(room).emit("blackjack:round-result", roundResultPayload);

    // Also notify tournament spectators so standings page auto-refreshes
    const matchDoc = await Match.findById(gameId).select("tournament").lean() as any;
    if (matchDoc?.tournament) {
      io.to(`tournament:${matchDoc.tournament}`).emit("blackjack:round-result", roundResultPayload);
    }

    setTimeout(async () => {
      if (state.isOver) {
        state.phase = "game-over";
        await persistState(state, "game-over");
        await finalizeMatch(io, state);
        const leaderboard = blackjackEngine.getLeaderboard(gameId);
        const tournamentContinues = await handleTournamentStageEnd(io, gameId, state);
        if (!tournamentContinues) {
          io.to(room).emit("blackjack:game-over", { gameId, finalLeaderboard: leaderboard });
        }
        return;
      }

      if (blackjackEngine.isGameOver(gameId)) return;
      const bettingState = blackjackEngine.startBettingPhase(gameId);
      await persistState(bettingState, `betting:${bettingState.currentRound}`);

      io.to(room).emit("blackjack:round-start", {
        gameId,
        round: bettingState.currentRound,
        phase: "betting",
        players: bettingState.playerStates.map(ps => ({ id: ps.playerId, tokens: ps.tokens })),
      });

      for (const ps of bettingState.playerStates) {
        if (ps.tokens > 0) startPlayerTimer(io, gameId, ps.playerId, BET_TIMEOUT_MS);
      }
    }, NEXT_ROUND_DELAY_MS);

    return;
  }

  if (state.isOver) {
    await persistState(state, "game-over");
    await finalizeMatch(io, state);
    const leaderboard = blackjackEngine.getLeaderboard(gameId);
    io.to(room).emit("blackjack:game-over", { gameId, finalLeaderboard: leaderboard });
    await handleTournamentStageEnd(io, gameId, state);
    return;
  }

  io.to(room).emit("blackjack:game-state", buildStatePayload(gameId, state));

  const currentPlayer = state.playerStates[state.currentPlayerIndex];
  if (currentPlayer?.status === "playing") {
    startPlayerTimer(io, gameId, currentPlayer.playerId);
  }
};

// ── Socket event handlers ──────────────────────────────────────────────────────

export function setupBlackjackSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on(
      "blackjack:request-state",
      async (payload: { gameId: string }, ack?: (res: { ok: boolean; message?: string }) => void) => {
        if (!payload?.gameId) { ack?.({ ok: false, message: "gameId is required" }); return; }
        const { gameId } = payload;

        try {
          let state: BlackjackGameState | null = null;
          try {
            state = blackjackEngine.getState(gameId);
          } catch {
            const persisted = await BlackjackGameStateModel.findOne({ gameId })
              .select("stateSnapshot").lean() as { stateSnapshot: BlackjackGameState } | null;
            if (persisted?.stateSnapshot) {
              blackjackEngine.restoreGame(gameId, persisted.stateSnapshot);
              state = persisted.stateSnapshot;
            }
          }

          if (!state) { ack?.({ ok: false, message: "Game not found" }); return; }

          socket.emit("blackjack:game-start", buildStatePayload(gameId, state));

          if (!state.isOver) {
            if (state.roundActive) {
              const currentPlayer = state.playerStates[state.currentPlayerIndex];
              if (currentPlayer) startPlayerTimer(io, gameId, currentPlayer.playerId);
            } else if (state.phase === "betting") {
              for (const ps of state.playerStates) {
                if (ps.tokens > 0 && !ps.hasBet) {
                  startPlayerTimer(io, gameId, ps.playerId, BET_TIMEOUT_MS);
                }
              }
            }
          }

          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    );

    socket.on(
      "blackjack:place-bet",
      async (payload: { gameId: string; bet: number }, ack?: (res: { ok: boolean; message?: string }) => void) => {
        if (!payload?.gameId || payload?.bet === undefined) {
          ack?.({ ok: false, message: "gameId and bet are required" });
          return;
        }

        const { gameId, bet } = payload;
        clearPlayerTimer(gameId, userId);

        try {
          await restoreGameIfNeeded(gameId);

          const { state, allBetsPlaced } = blackjackEngine.placeBet(gameId, userId, bet);
          await persistState(state, `bet:${bet}:${userId}`);

          io.to(`game:${gameId}`).emit("blackjack:bet-placed", {
            gameId,
            playerId: userId,
            bet,
            playersReady: state.playerStates.filter(p => p.hasBet).length,
            totalPlayers: state.playerStates.filter(p => p.tokens > 0).length,
          });

          ack?.({ ok: true });

          if (allBetsPlaced) {
            const playingState = blackjackEngine.dealCards(gameId);
            await persistState(playingState, "deal");
            await broadcastState(io, gameId, playingState);
          }
        } catch (err) {
          ack?.({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    );

    socket.on(
      "blackjack:player-action",
      async (payload: { gameId: string; action: BlackjackMove }, ack?: (res: { ok: boolean; message?: string }) => void) => {
        if (!payload?.gameId || !payload?.action) {
          ack?.({ ok: false, message: "gameId and action are required" });
          return;
        }

        const { gameId, action } = payload;
        clearPlayerTimer(gameId, userId);

        try {
          await restoreGameIfNeeded(gameId);

          const state = blackjackEngine.makeMove(gameId, userId, action);
          await persistState(state, `move:${action}:${userId}`);
          ack?.({ ok: true });
          await broadcastState(io, gameId, state);
        } catch (err) {
          ack?.({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    );
  });

  // Register forfeit handler — called when a player's 60s reconnect window expires
  onPlayerAbandoned(async (io, gameId, playerId) => {
    try {
      let state: BlackjackGameState;
      try {
        state = blackjackEngine.getState(gameId);
      } catch {
        // Game not in memory — already over or not a blackjack game, skip
        return;
      }
      if (state.isOver) return;

      clearPlayerTimer(gameId, playerId);
      state = blackjackEngine.forfeitPlayer(gameId, playerId);
      await persistState(state, `forfeit:${playerId}`);

      io.to(`game:${gameId}`).emit("blackjack:player-forfeited", { gameId, playerId });

      // If forfeit happened during betting phase, check if remaining players are all ready
      if (state.phase === "betting") {
        const allBetsPlaced = state.playerStates
          .filter(ps => ps.tokens > 0)
          .every(ps => ps.hasBet);
        if (allBetsPlaced) {
          const playingState = blackjackEngine.dealCards(gameId);
          await persistState(playingState, "deal");
          await broadcastState(io, gameId, playingState);
          return;
        }
      }

      await broadcastState(io, gameId, state);
    } catch (err) {
      console.error(`[blackjack] forfeit error game=${gameId} player=${playerId}:`, err);
    }
  });
}
