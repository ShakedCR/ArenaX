import { Server } from "socket.io";
import User from "../models/user.model";
import { blackjackEngine } from "../blackjack/engine";
import { calculateMultiplayerElo, EloResult } from "../utils/elo.utils";

export type SupportedGame = "blackjack" | "trivia";

/**
 * Core Elo update: accepts a pre-built ranked leaderboard, reads current
 * per-game ratings from MongoDB, applies calculateMultiplayerElo, persists
 * the new ratings, and emits elo:updated to each player's personal room.
 *
 * Used directly by Trivia (leaderboard already available at completion).
 * Used internally by updateEloAfterGame for Blackjack.
 */
export const updateEloFromLeaderboard = async (
  io: Server,
  rankedPlayers: { playerId: string; rank: number }[],
  game: SupportedGame
): Promise<EloResult[]> => {
  if (rankedPlayers.length < 2) return [];

  const playerIds = rankedPlayers.map(e => e.playerId);

  const users = await User.find({ _id: { $in: playerIds } })
    .select("_id elo")
    .lean() as { _id: any; elo?: { blackjack?: number; trivia?: number } }[];

  const userById = new Map(users.map(u => [u._id.toString(), u]));

  const inputs = rankedPlayers.map(entry => ({
    playerId: entry.playerId,
    rating: userById.get(entry.playerId)?.elo?.[game] ?? 1200,
    rank: entry.rank,
  }));

  const results = calculateMultiplayerElo(inputs);

  if (results.length > 0) {
    const bulkOps = results.map(r => ({
      updateOne: {
        filter: { _id: r.playerId },
        update: { $set: { [`elo.${game}`]: r.newRating } },
      },
    }));
    await User.bulkWrite(bulkOps);
  }

  for (const result of results) {
    io.to(`user:${result.playerId}`).emit("elo:updated", {
      game,
      oldRating: result.oldRating,
      newRating: result.newRating,
      delta: result.delta,
    });
  }

  return results;
};

/**
 * Blackjack-specific wrapper: reads the leaderboard from the in-memory
 * blackjack engine for the given gameId, then delegates to updateEloFromLeaderboard.
 *
 * Called fire-and-forget from finalizeMatch() in blackjack/tournament.service.ts.
 * Behavior is identical to before this refactor.
 */
export const updateEloAfterGame = async (
  io: Server,
  gameId: string,
  game: "blackjack"
): Promise<EloResult[]> => {
  const leaderboard = blackjackEngine.getLeaderboard(gameId);
  if (leaderboard.length < 2) return [];

  return updateEloFromLeaderboard(
    io,
    leaderboard.map(e => ({ playerId: e.playerId, rank: e.rank })),
    game
  );
};
