/**
 * game.service.ts
 *
 * Helpers used by the tournament controller that deal with game creation and
 * invite-code management. Extracted so the controller stays focused on
 * HTTP request/response handling.
 */

import { Types } from "mongoose";
import { blackjackEngine } from "./engine";
import BlackjackGameStateModel from "./game-state.model";
import Match from "../models/match.model";
import Tournament from "../models/tournament.model";
import User from "../models/user.model";

// ── Invite code utilities ──────────────────────────────────────────────────────

const generateInviteCode = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `${randomPart}${timePart}`;
};

export const generateUniqueInviteCode = async (): Promise<string> => {
  let inviteCode: string;
  let exists = true;
  while (exists) {
    inviteCode = generateInviteCode();
    exists = !!(await Tournament.exists({ inviteCode }));
  }
  return inviteCode!;
};

// ── Game creation ──────────────────────────────────────────────────────────────

/**
 * Creates a single Blackjack match with all given players at the table,
 * initialises the engine, and persists the initial state.
 */
export const createBlackjackGame = async (
  tournamentId: Types.ObjectId,
  playerIds: string[],
  stage: number
): Promise<{ matchId: string; gameId: string }> => {
  // Deduplicate player IDs as a safety net against any upstream race conditions
  const uniquePlayerIds = [...new Set(playerIds)];
  if (uniquePlayerIds.length < 2) throw new Error("Need at least 2 unique players to start a game");

  const users = await User.find({ _id: { $in: uniquePlayerIds } })
    .select("_id username fullName").lean() as { _id: Types.ObjectId; username?: string; fullName?: string }[];

  const players = uniquePlayerIds.map(pid => {
    const u = users.find(u => u._id.toString() === pid);
    return { id: pid, name: u?.username || u?.fullName || pid };
  });

  const match = await Match.create({
    tournament: tournamentId,
    gameTitle: "Blackjack",
    round: stage,
    participants: playerIds.map(id => new Types.ObjectId(id)),
    status: "live",
    startedAt: new Date(),
  });

  const gameId = (match._id as Types.ObjectId).toString();

  blackjackEngine.createGame(gameId, players);
  const state = blackjackEngine.startBettingPhase(gameId);

  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId },
    {
      $set: {
        status: "active",
        stateSnapshot: state,
        leaderboard: blackjackEngine.getLeaderboard(gameId),
        lastAction: "betting",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Match.findByIdAndUpdate(match._id, { "matchData.gameId": gameId });

  return { matchId: gameId, gameId };
};
