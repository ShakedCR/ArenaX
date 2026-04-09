import { Server } from "socket.io";

/**
 * Blackjack Socket Events — Contract
 *
 * CLIENT → SERVER:
 *   blackjack:player-action  { gameId, action: "hit" | "stand" | "double" }
 *
 * SERVER → CLIENT:
 *   blackjack:game-start     { gameId, players, round: 1, totalRounds: 5 }
 *   blackjack:game-state     { gameId, dealerCards, players: [{id, cards, bet, status}], round }
 *   blackjack:round-start    { gameId, round, players: [{id, tokens}] }
 *   blackjack:round-result   { gameId, round, results: [{id, outcome, delta}], leaderboard }
 *   blackjack:timeout        { gameId, playerId } — player did not act in 60s → auto stand
 *   blackjack:player-disconnected { gameId, playerId }
 *   blackjack:game-over      { gameId, finalLeaderboard: [{id, tokens, rank}] }
 */
export function setupBlackjackSocket(_io: Server): void {
  // TODO [KAN-102] (Phase 2): implement Blackjack game loop via Socket.io
  // Use BlackjackEngine from ../games/blackjack.engine.ts
  // Flow:
  //   1. tournament:started triggers blackjack:game-start for each group
  //   2. Each round: deal cards, emit blackjack:game-state
  //   3. Listen for blackjack:player-action (60s timeout per player)
  //   4. After all players acted: reveal dealer, emit blackjack:round-result
  //   5. Repeat 5 rounds, then emit blackjack:game-over
}
