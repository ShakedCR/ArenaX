import { Server, Socket } from "socket.io";
import { blackjackEngine, BlackjackMove, BlackjackGameState } from "../games/blackjack.engine";
import BlackjackGameStateModel from "../models/blackjack-game-state.model";
import Match from "../models/match.model";

/**
 * Blackjack Socket Events — Contract
 *
 * CLIENT → SERVER:
 *   blackjack:request-state  { gameId } — sent after player:join to receive current state + start timers
 *   blackjack:player-action  { gameId, action: "hit" | "stand" | "double" }
 *
 * SERVER → CLIENT:
 *   blackjack:game-start     { gameId, players, round: 1, totalRounds: 5 }
 *   blackjack:game-state     { gameId, dealerCards, players: [{id, cards, bet, status}], round }
 *   blackjack:round-start    { gameId, round, players: [{id, tokens}] }
 *   blackjack:round-result   { gameId, round, dealerCards, results: [{id, outcome, delta}], leaderboard }
 *   blackjack:timeout        { gameId, playerId } — player did not act in 60s → auto stand
 *   blackjack:player-disconnected { gameId, playerId }
 *   blackjack:game-over      { gameId, finalLeaderboard: [{id, tokens, rank}] }
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Time (ms) a player has to act before auto-stand */
const PLAYER_TIMEOUT_MS = 60_000;

/** Delay (ms) between round-result and the next round-start */
const NEXT_ROUND_DELAY_MS = 3_000;

// ─── Timer management ─────────────────────────────────────────────────────────

/** Key format: "gameId:playerId" */
const playerTimers = new Map<string, NodeJS.Timeout>();

const timerKey = (gameId: string, playerId: string) => `${gameId}:${playerId}`;

/** Cancel an existing player action timer (called when the player acts in time) */
const clearPlayerTimer = (gameId: string, playerId: string): void => {
  const key = timerKey(gameId, playerId);
  const timer = playerTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    playerTimers.delete(key);
  }
};

/**
 * Start a 60-second countdown for a player.
 * If the timer fires, auto-stand is applied and the game continues.
 */
const startPlayerTimer = (io: Server, gameId: string, playerId: string): void => {
  clearPlayerTimer(gameId, playerId); // reset any previous timer

  const key = timerKey(gameId, playerId);

  const timer = setTimeout(() => {
    playerTimers.delete(key);

    // Notify everyone the player timed out
    io.to(`game:${gameId}`).emit("blackjack:timeout", { gameId, playerId });

    // Apply auto-stand, persist, and continue the game flow
    const state = blackjackEngine.handleTimeout(gameId, playerId);
    // void: fire-and-forget is intentional here (inside setTimeout callback)
    void persistState(state, `timeout:${playerId}`).then(() =>
      emitRoundOrGameState(io, gameId, state)
    );
  }, PLAYER_TIMEOUT_MS);

  playerTimers.set(key, timer);
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

/**
 * Saves the current game state snapshot to MongoDB after every socket move.
 * This mirrors what the REST controller does (KAN-43) — ensures reconnecting
 * players always get the latest state even if moves came via Socket.io.
 */
const persistState = async (state: BlackjackGameState, lastAction: string): Promise<void> => {
  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId: state.gameId },
    {
      $set: {
        status: state.isOver ? "completed" : "active",
        stateSnapshot: state,
        leaderboard: blackjackEngine.getLeaderboard(state.gameId),
        lastAction
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * When a game ends, marks the Match document as completed and records the winner.
 * The Match _id equals the gameId (set in startTournament), so we can look it up directly.
 */
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

// ─── State broadcast helper ───────────────────────────────────────────────────

/**
 * After every move, decide what to broadcast based on the current game state:
 *  - Game over → emit blackjack:game-over with final leaderboard
 *  - Round ended (all players acted) → emit blackjack:round-result (KAN-48),
 *    then after 3 seconds start the next round or end the game
 *  - Round still active → emit blackjack:game-state so all players see current cards
 */
const emitRoundOrGameState = async (io: Server, gameId: string, state: BlackjackGameState): Promise<void> => {
  const room = `game:${gameId}`;

  if (state.isOver) {
    // ── Game over ─────────────────────────────────────────────────────────────
    // Persist final state and mark Match as completed before notifying clients
    await persistState(state, "game-over");
    await finalizeMatch(state);

    io.to(room).emit("blackjack:game-over", {
      gameId,
      finalLeaderboard: blackjackEngine.getLeaderboard(gameId)
    });
    return;
  }

  if (!state.roundActive) {
    // ── Round ended — KAN-48: compare scores + emit leaderboard ───────────────
    io.to(room).emit("blackjack:round-result", {
      gameId,
      round: state.currentRound,
      dealerCards: state.dealerCards,
      // Per-player outcome: win / loss / draw based on token delta
      results: state.playerStates.map(ps => ({
        id: ps.playerId,
        outcome: (ps.currentHand?.roundDelta ?? 0) > 0
          ? "win"
          : (ps.currentHand?.roundDelta ?? 0) < 0
            ? "loss"
            : "draw",
        delta: ps.currentHand?.roundDelta ?? 0
      })),
      // KAN-48: ranked leaderboard so all clients can render the standings table
      leaderboard: blackjackEngine.getLeaderboard(gameId)
    });

    // Wait 3 seconds so players can read the round result, then start next round
    setTimeout(async () => {
      // Re-check in case game ended while we were waiting
      if (blackjackEngine.isGameOver(gameId)) return;

      const nextState = blackjackEngine.startRound(gameId);

      // Persist the new round state so reconnecting players get fresh cards
      await persistState(nextState, `round-start:${nextState.currentRound}`);

      io.to(room).emit("blackjack:round-start", {
        gameId,
        round: nextState.currentRound,
        // Send each player their updated token count going into the round
        players: nextState.playerStates.map(ps => ({
          id: ps.playerId,
          tokens: ps.tokens
        }))
      });

      // Broadcast the initial cards dealt at round start
      io.to(room).emit("blackjack:game-state", buildGameStatePayload(gameId, nextState));

      // Start the timer for the first player who hasn't acted yet
      startNextPlayerTimer(io, gameId, nextState);
    }, NEXT_ROUND_DELAY_MS);

    return;
  }

  // ── Round still active — broadcast current cards to all players ──────────────
  io.to(room).emit("blackjack:game-state", buildGameStatePayload(gameId, state));
};

/** Serialise the current game state into the payload clients expect */
const buildGameStatePayload = (gameId: string, state: BlackjackGameState) => ({
  gameId,
  round: state.currentRound,
  dealerCards: state.dealerCards,
  players: state.playerStates.map(ps => ({
    id: ps.playerId,
    cards: ps.currentHand?.cards ?? [],
    bet: ps.currentHand?.bet ?? 0,
    status: ps.currentHand?.stage ?? "done",
    playerValue: ps.currentHand?.playerValue ?? { hi: 0, lo: 0 },
    hasActed: ps.hasActed,
    availableActions: ps.currentHand?.availableActions ?? {}
  }))
});

/**
 * Find the first player in the round who still needs to act,
 * and start a 60-second action timer for them.
 */
const startNextPlayerTimer = (io: Server, gameId: string, state: BlackjackGameState): void => {
  const nextPlayer = state.playerStates.find(ps => !ps.hasActed && ps.currentHand);
  if (nextPlayer) {
    startPlayerTimer(io, gameId, nextPlayer.playerId);
  }
};

// ─── Socket handler ───────────────────────────────────────────────────────────

export function setupBlackjackSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    /**
     * blackjack:request-state
     * Client sends this immediately after player:join to get the current game state.
     * Solves two problems:
     *  1. blackjack:game-start fires before players join the room — this is the recovery mechanism
     *  2. The 60-second timer for round 1 starts here, when the player actually sees the cards
     */
    socket.on(
      "blackjack:request-state",
      async (payload: { gameId: string }, ack?: (res: { ok: boolean; message?: string }) => void) => {
        if (!payload?.gameId) {
          ack?.({ ok: false, message: "gameId is required" });
          return;
        }

        const { gameId } = payload;

        try {
          // Try in-memory engine first, fall back to MongoDB for reconnected players
          let state: BlackjackGameState | null = null;
          try {
            state = blackjackEngine.getState(gameId);
          } catch {
            // Game not in memory — load from MongoDB
            const persisted = await BlackjackGameStateModel.findOne({ gameId })
              .select("stateSnapshot")
              .lean() as { stateSnapshot: BlackjackGameState } | null;
            if (persisted) state = persisted.stateSnapshot;
          }

          if (!state) {
            ack?.({ ok: false, message: "Game not found" });
            return;
          }

          // Send the full game state so the client can render cards and UI
          socket.emit("blackjack:game-start", {
            gameId,
            players: state.players,
            round: state.currentRound,
            totalRounds: state.totalRounds,
            dealerCards: state.dealerCards,
            playerStates: state.playerStates.map((ps) => ({
              id: ps.playerId,
              cards: ps.currentHand?.cards ?? [],
              bet: ps.currentHand?.bet ?? 0,
              tokens: ps.tokens,
              hasActed: ps.hasActed,
              availableActions: ps.currentHand?.availableActions ?? {}
            }))
          });

          // Start the 60s timer for the first player who hasn't acted yet.
          // This handles round 1 (timer never started at server boot) as well as
          // mid-round reconnects where the timer was cleared on disconnect.
          if (state.roundActive && !state.isOver) {
            startNextPlayerTimer(io, gameId, state);
          }

          ack?.({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          ack?.({ ok: false, message });
        }
      }
    );

    /**
     * blackjack:player-action
     * Fired when a player clicks Hit / Stand / Double.
     * Validates the action, applies it via the engine, and broadcasts the result.
     */
    socket.on(
      "blackjack:player-action",
      async (payload: { gameId: string; action: BlackjackMove }, ack?: (res: { ok: boolean; message?: string }) => void) => {
        if (!payload?.gameId || !payload?.action) {
          ack?.({ ok: false, message: "gameId and action are required" });
          return;
        }

        const { gameId, action } = payload;

        // Cancel the player's countdown — they acted in time
        clearPlayerTimer(gameId, userId);

        try {
          // Apply the move via the engine (auto-resolves round when all players acted)
          const state = blackjackEngine.makeMove(gameId, userId, action);

          // KAN-43: persist after every socket move (mirrors REST controller behaviour)
          await persistState(state, `move:${action}:${userId}`);

          ack?.({ ok: true });

          // Broadcast new state / round result / game over to the entire room
          await emitRoundOrGameState(io, gameId, state);

          // If the round is still going, start the timer for the next waiting player
          if (state.roundActive) {
            startNextPlayerTimer(io, gameId, state);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          ack?.({ ok: false, message });
        }
      }
    );
  });
}
