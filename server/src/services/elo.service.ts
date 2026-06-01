import { Server } from "socket.io";
import User from "../models/user.model";
import { blackjackEngine } from "../blackjack/engine";
import { calculateMultiplayerElo, EloResult } from "../utils/elo.utils";

type SupportedGame = "blackjack";

const engineMap: Record<SupportedGame, { getLeaderboard: (gameId: string) => { playerId: string; rank: number }[] }> = {
  blackjack: blackjackEngine,
};

/**
 * Reads current Elo ratings for all players in a completed game,
 * runs the multiplayer Elo calculation, persists the new ratings,
 * and emits `elo:updated` to each player's personal socket room.
 *
 * @returns Array of per-player Elo results (useful for broadcasting to the UI)
 */
export const updateEloAfterGame = async (
  io: Server,
  gameId: string,
  game: SupportedGame
): Promise<EloResult[]> => {
  const leaderboard = engineMap[game].getLeaderboard(gameId);
  if (leaderboard.length < 2) return [];

  const playerIds = leaderboard.map(e => e.playerId);

  const users = await User.find({ _id: { $in: playerIds } })
    .select("_id elo")
    .lean() as { _id: any; elo?: { blackjack?: number } }[];

  const userById = new Map(users.map(u => [u._id.toString(), u]));

  const inputs = leaderboard.map(entry => ({
    playerId: entry.playerId,
    rating: userById.get(entry.playerId)?.elo?.[game] ?? 1200,
    rank: entry.rank,
  }));

  const results = calculateMultiplayerElo(inputs);

  // Bulk write new ratings
  if (results.length > 0) {
    const bulkOps = results.map(r => ({
      updateOne: {
        filter: { _id: r.playerId },
        update: { $set: { [`elo.${game}`]: r.newRating } },
      },
    }));
    await User.bulkWrite(bulkOps);
  }

  // Notify each player via their personal socket room
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
