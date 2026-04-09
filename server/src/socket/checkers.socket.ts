import { Server } from "socket.io";

/**
 * Checkers Socket Events — Contract
 *
 * CLIENT → SERVER:
 *   checkers:move  { matchId, from: number, to: number }
 *   checkers:resign { matchId }
 *
 * SERVER → CLIENT:
 *   checkers:game-start  { matchId, player1: userId, player2: userId, board: string }
 *   checkers:game-state  { matchId, board, turn, lastMove, timers: {p1, p2} }
 *   checkers:move        { matchId, from, to, board, captures, timers }
 *   checkers:game-over   { matchId, winner: userId | null, reason: "no-moves"|"timeout"|"resign" }
 *   checkers:timeout     { matchId, loser: userId }
 */
export function setupCheckersSocket(_io: Server): void {
  // TODO [KAN-103] (Phase 3): implement Checkers 1v1 via Socket.io
  // Use CheckersEngine from ../games/checkers.engine.ts (wraps draughts.js)
  // Similar structure to chess.socket.ts
}
