import { Server, Socket } from "socket.io";
import { blackjackEngine, BlackjackMove, BlackjackGameState } from "../games/blackjack.engine";
import BlackjackGameStateModel from "../models/blackjack-game-state.model";
import Match from "../models/match.model";
import Tournament from "../models/tournament.model";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { Types } from "mongoose";

const PLAYER_TIMEOUT_MS = 60_000;
const BET_TIMEOUT_MS = 30_000;
const NEXT_ROUND_DELAY_MS = 7_000;
const NEXT_STAGE_DELAY_MS = 8_000;

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
      void persistState(state, `timeout:${playerId}`).then(() =>
        broadcastState(io, gameId, state)
      );
    } catch {}
  }, ms);
  playerTimers.set(key, timer);
};

const restoreGameIfNeeded = async (gameId: string): Promise<void> => {
  try {
    blackjackEngine.getState(gameId);
  } catch {
    const persisted = await BlackjackGameStateModel.findOne({ gameId })
      .select("stateSnapshot").lean() as { stateSnapshot: BlackjackGameState } | null;
    if (persisted?.stateSnapshot) {
      (blackjackEngine as any)["games"].set(gameId, persisted.stateSnapshot);
    }
  }
};

const persistState = async (state: BlackjackGameState, lastAction: string): Promise<void> => {
  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId: state.gameId },
    { $set: {
        status: state.isOver ? "completed" : "active",
        stateSnapshot: state,
        leaderboard: blackjackEngine.getLeaderboard(state.gameId),
        lastAction
    }},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const finalizeMatch = async (state: BlackjackGameState): Promise<void> => {
  const winnerId = state.result?.winnerId ?? null;
  await Match.findByIdAndUpdate(state.gameId, {
    status: "completed",
    endedAt: new Date(),
    ...(winnerId && { "result.winner": winnerId }),
    "result.score": blackjackEngine
      .getLeaderboard(state.gameId)
      .map((e) => `${e.playerId}:${e.tokens}`)
      .join(",")
  });
};

const handValue = (cards: { rank: string; value: number }[]): { hi: number; lo: number } => {
  let total = 0; let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") { aces++; total += 11; }
    else total += card.value;
  }
  const lo = total - aces * 10;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { hi: total, lo };
};

const buildStatePayload = (gameId: string, state: BlackjackGameState) => {
  const currentPlayer = state.playerStates[state.currentPlayerIndex];

  const lastRoundResult = state.phase === "round-over" ? {
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
        outcome: h.roundDelta > 0 ? "win" : h.roundDelta < 0 ? "loss" : "draw"
      }))
    })),
    leaderboard: blackjackEngine.getLeaderboard(gameId)
  } : null;

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
    })
  };
};

const handleTournamentStageEnd = async (io: Server, gameId: string, state: BlackjackGameState): Promise<void> => {
  const match = await Match.findById(gameId).lean() as any;
  if (!match?.tournament) return;

  const tournament = await Tournament.findById(match.tournament).lean() as any;
  if (!tournament) return;

  const currentStage = tournament.matchData?.currentStage ?? 1;
  const advancingCount = tournament.matchData?.advancingCount ?? 0;
  const leaderboard = blackjackEngine.getLeaderboard(gameId);

  if (advancingCount === 0 || leaderboard.length <= advancingCount) {
    const prizePool = tournament.prizePool || 0;
    const topTokens = leaderboard[0]?.tokens ?? 0;
    const winners = topTokens > 0
      ? leaderboard.filter(e => e.tokens === topTokens)
      : [];
    const isTie = winners.length > 1;
    const splitPrize = winners.length > 0 ? Math.floor(prizePool / winners.length) : 0;

    for (const winner of winners) {
      if (splitPrize > 0) {
        const updatedUser = await User.findByIdAndUpdate(
          winner.playerId,
          { $inc: { walletBalance: splitPrize } },
          { new: true }
        ).select("walletBalance");
        await Transaction.create({
          user: winner.playerId,
          tournament: match.tournament,
          amount: splitPrize,
          type: "prize",
          status: "completed",
          description: isTie ? "Tournament prize (tie split)" : "Tournament prize"
        });
        if (updatedUser) {
          io.to(`user:${winner.playerId}`).emit("wallet:updated", {
            walletBalance: updatedUser.walletBalance,
          });
        }
      }
    }

    await Tournament.findByIdAndUpdate(match.tournament, { status: "completed", prizePool: 0 });

    io.to(`game:${gameId}`).emit("blackjack:tournament-over", {
      tournamentId: match.tournament.toString(),
      winner: isTie ? null : (winners[0] ?? null),
      winners: isTie ? winners : null,
      isTie,
      splitPrize: isTie ? splitPrize : null,
      finalLeaderboard: leaderboard,
      prize: prizePool
    });
    return;
  }

  const cutoffTokens = leaderboard[advancingCount - 1]?.tokens ?? 0;
  const clearlyAdvancing = leaderboard.filter(e => e.tokens > cutoffTokens && e.tokens > 0);
  const tiedAtCutoff = leaderboard.filter(e => e.tokens === cutoffTokens && e.tokens > 0);
  const spotsLeft = advancingCount - clearlyAdvancing.length;
  const selectedFromTie = [...tiedAtCutoff]
    .sort(() => Math.random() - 0.5)
    .slice(0, spotsLeft);
  const advancingPlayerIds = [...clearlyAdvancing, ...selectedFromTie].map(e => e.playerId);
  const eliminatedPlayerIds = leaderboard
    .filter(e => !advancingPlayerIds.includes(e.playerId))
    .map(e => e.playerId);

  io.to(`game:${gameId}`).emit("blackjack:stage-over", {
    gameId,
    stage: currentStage,
    advancingPlayers: advancingPlayerIds,
    eliminatedPlayers: eliminatedPlayerIds,
    leaderboard,
    nextStageIn: NEXT_STAGE_DELAY_MS
  });

  setTimeout(async () => {
    try {
      const users = await User.find({ _id: { $in: advancingPlayerIds } })
        .select("_id username fullName").lean() as { _id: Types.ObjectId; username?: string; fullName?: string }[];

      const players = advancingPlayerIds.map(pid => {
        const u = users.find(u => u._id.toString() === pid);
        return { id: pid, name: u?.username || u?.fullName || pid };
      });

      const newMatch = await Match.create({
        tournament: match.tournament,
        gameTitle: "Blackjack",
        round: currentStage + 1,
        participants: advancingPlayerIds.map(id => new Types.ObjectId(id)),
        status: "live",
        startedAt: new Date()
      });

      const newGameId = (newMatch._id as Types.ObjectId).toString();

      blackjackEngine.createGame(newGameId, players);
      const newState = blackjackEngine.startBettingPhase(newGameId);

      await BlackjackGameStateModel.findOneAndUpdate(
        { gameId: newGameId },
        { $set: { status: "active", stateSnapshot: newState, leaderboard: blackjackEngine.getLeaderboard(newGameId), lastAction: "betting" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await Match.findByIdAndUpdate(newMatch._id, { "matchData.gameId": newGameId });

      await Tournament.findByIdAndUpdate(match.tournament, {
        "matchData.currentGameId": newGameId,
        "matchData.currentStage": currentStage + 1,
        "matchData.advancingCount": advancingPlayerIds.length <= 3 ? 0 : Math.ceil(advancingPlayerIds.length / 2)
      });

      io.to(`game:${gameId}`).emit("blackjack:next-stage", {
        tournamentId: match.tournament.toString(),
        gameId: newGameId,
        stage: currentStage + 1,
        players: advancingPlayerIds
      });
    } catch (err) {
      console.error("Stage progression error:", err);
    }
  }, NEXT_STAGE_DELAY_MS);
};

const broadcastState = async (io: Server, gameId: string, state: BlackjackGameState): Promise<void> => {
  const room = `game:${gameId}`;

  if (state.isOver) {
    await persistState(state, "game-over");
    await finalizeMatch(state);
    const leaderboard = blackjackEngine.getLeaderboard(gameId);
    io.to(room).emit("blackjack:game-over", { gameId, finalLeaderboard: leaderboard });
    await handleTournamentStageEnd(io, gameId, state);
    return;
  }

  if (state.phase === "round-over") {
    for (const ps of state.playerStates) {
      clearPlayerTimer(gameId, ps.playerId);
    }
    io.to(room).emit("blackjack:round-result", {
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
          outcome: h.roundDelta > 0 ? "win" : h.roundDelta < 0 ? "loss" : "draw"
        }))
      })),
      leaderboard: blackjackEngine.getLeaderboard(gameId)
    });

    setTimeout(async () => {
      if (blackjackEngine.isGameOver(gameId)) return;
      const bettingState = blackjackEngine.startBettingPhase(gameId);
      await persistState(bettingState, `betting:${bettingState.currentRound}`);

      io.to(room).emit("blackjack:round-start", {
        gameId,
        round: bettingState.currentRound,
        phase: "betting",
        players: bettingState.playerStates.map(ps => ({ id: ps.playerId, tokens: ps.tokens }))
      });

      for (const ps of bettingState.playerStates) {
        if (ps.tokens > 0) startPlayerTimer(io, gameId, ps.playerId, BET_TIMEOUT_MS);
      }
    }, NEXT_ROUND_DELAY_MS);

    return;
  }

  io.to(room).emit("blackjack:game-state", buildStatePayload(gameId, state));

  const currentPlayer = state.playerStates[state.currentPlayerIndex];
  if (currentPlayer && currentPlayer.status === "playing") {
    startPlayerTimer(io, gameId, currentPlayer.playerId);
  }
};

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
              (blackjackEngine as any)["games"].set(gameId, persisted.stateSnapshot);
              state = persisted.stateSnapshot;
            }
          }

          if (!state) { ack?.({ ok: false, message: "Game not found" }); return; }

          const statePayload = buildStatePayload(gameId, state);
          socket.emit("blackjack:game-start", { ...statePayload });

          if (state.roundActive && !state.isOver) {
            const currentPlayer = state.playerStates[state.currentPlayerIndex];
            if (currentPlayer) startPlayerTimer(io, gameId, currentPlayer.playerId);
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
            totalPlayers: state.playerStates.filter(p => p.tokens > 0).length
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
}