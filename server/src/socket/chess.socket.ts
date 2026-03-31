import { Server } from "socket.io";

/**
 * Chess Socket Events — Contract
 *
 * CLIENT → SERVER:
 *   chess:move     { matchId, from: string, to: string, promotion?: string }
 *   chess:resign   { matchId }
 *   chess:offer-draw  { matchId }
 *   chess:accept-draw { matchId }
 *
 * SERVER → CLIENT:
 *   chess:game-start  { matchId, white: userId, black: userId, fen: string }
 *   chess:game-state  { matchId, fen, turn, lastMove, timers: {white, black} }
 *   chess:move        { matchId, from, to, promotion, fen, timers }
 *   chess:game-over   { matchId, winner: userId | null, reason: "checkmate"|"timeout"|"resign"|"draw" }
 *   chess:timeout     { matchId, loser: userId }
 *   chess:draw-offered { matchId, by: userId }
 */
export function setupChessSocket(_io: Server): void {
  // TODO [KAN-104] (Phase 3): implement Chess 1v1 via Socket.io
  // Use ChessEngine from ../games/chess.engine.ts
  // Flow:
  //   1. Match created → emit chess:game-start (white/black assigned randomly)
  //   2. Listen for chess:move, validate via chess.js, emit chess:game-state to both players
  //   3. 10-minute timer per player, decrement server-side — emit chess:timeout if expired
  //   4. Detect checkmate/stalemate via chess.js, emit chess:game-over
  //   5. On chess:game-over → update Elo ratings
}
