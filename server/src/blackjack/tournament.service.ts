/**
 * tournament.service.ts
 *
 * Tournament stage-progression logic for Blackjack.
 * Extracted from socket.ts so the socket file stays focused on
 * real-time event handling, and this file owns tournament lifecycle concerns
 * (prize distribution, stage creation, match finalization).
 */

import { Server } from "socket.io";
import { Types } from "mongoose";
import { blackjackEngine, BlackjackGameState } from "./engine";
import { getAdvancingCount } from "../utils/tournament.utils";
import { updateEloAfterGame } from "../services/elo.service";
import { getIO } from "../socket";
import BlackjackGameStateModel from "./game-state.model";
import Match from "../models/match.model";
import Tournament from "../models/tournament.model";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";

const NEXT_STAGE_DELAY_MS = 8_000;

// ── Match finalization ─────────────────────────────────────────────────────────

export const finalizeMatch = async (io: Server, state: BlackjackGameState): Promise<void> => {
  const winnerId = state.result?.winnerId ?? null;
  await Match.findByIdAndUpdate(state.gameId, {
    status: "completed",
    endedAt: new Date(),
    ...(winnerId && { "result.winner": winnerId }),
    "result.score": blackjackEngine
      .getLeaderboard(state.gameId)
      .map((e) => `${e.playerId}:${e.tokens}`)
      .join(","),
  });

  // Update Elo ratings and notify players — fire-and-forget, never block the game flow
  updateEloAfterGame(io, state.gameId, "blackjack").catch(err => {
    console.error("[elo] Failed to update Blackjack Elo:", err);
  });
};

// ── Tournament stage end ───────────────────────────────────────────────────────

// Returns true if the tournament continues to a next stage (so caller can skip game-over event)
export const handleTournamentStageEnd = async (
  io: Server,
  gameId: string,
  state: BlackjackGameState
): Promise<boolean> => {
  const match = await Match.findById(gameId).lean() as any;
  if (!match?.tournament) return false;

  const tournament = await Tournament.findById(match.tournament).lean() as any;
  if (!tournament) return false;

  const currentStage: number = tournament.matchData?.currentStage ?? 1;
  const advancingCount: number = tournament.matchData?.advancingCount ?? 0;
  const leaderboard = blackjackEngine.getLeaderboard(gameId);
  const tournamentRoomId = match.tournament.toString();

  // ── Final stage: end the tournament and distribute prizes ──────────────────
  const playersWithTokens = leaderboard.filter(e => e.tokens > 0);
  if (advancingCount === 0 || playersWithTokens.length <= advancingCount) {
    await endTournament(io, gameId, match, tournament, leaderboard, tournamentRoomId);
    return false;
  }

  // ── Intermediate stage: determine who advances ─────────────────────────────
  const cutoffTokens = leaderboard[advancingCount - 1]?.tokens ?? 0;
  const clearlyAdvancing = leaderboard.filter(e => e.tokens > cutoffTokens && e.tokens > 0);
  const tiedAtCutoff = leaderboard.filter(e => e.tokens === cutoffTokens && e.tokens > 0);
  const spotsLeft = advancingCount - clearlyAdvancing.length;
  const selectedFromTie = [...tiedAtCutoff]
    .sort(() => Math.random() - 0.5)
    .slice(0, spotsLeft);

  const advancingPlayerIds = [...clearlyAdvancing, ...selectedFromTie].map(e => e.playerId);

  // Safety: if no one can advance (everyone at 0 tokens), end the tournament instead
  if (advancingPlayerIds.length === 0) {
    await endTournament(io, gameId, match, tournament, leaderboard, tournamentRoomId);
    return false;
  }

  const eliminatedPlayerIds = leaderboard
    .filter(e => !advancingPlayerIds.includes(e.playerId))
    .map(e => e.playerId);

  io.to(`game:${gameId}`).to(`tournament:${tournamentRoomId}`).emit("blackjack:stage-over", {
    gameId,
    stage: currentStage,
    advancingPlayers: advancingPlayerIds,
    eliminatedPlayers: eliminatedPlayerIds,
    leaderboard,
    nextStageIn: NEXT_STAGE_DELAY_MS,
  });

  setTimeout(() => {
    createNextStage(io, gameId, match, currentStage, advancingPlayerIds, tournamentRoomId).catch(err => {
      console.error("[blackjack] Stage progression error:", err);
    });
  }, NEXT_STAGE_DELAY_MS);

  return true; // tournament continues — caller should skip game-over event
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function endTournament(
  io: Server,
  gameId: string,
  match: any,
  tournament: any,
  leaderboard: { playerId: string; tokens: number; rank: number }[],
  tournamentRoomId: string
): Promise<void> {
  const prizePool: number = tournament.prizePool || 0;
  const topTokens = leaderboard[0]?.tokens ?? 0;
  const winners = topTokens > 0 ? leaderboard.filter(e => e.tokens === topTokens) : [];
  const isTie = winners.length > 1;
  const splitPrize = winners.length > 0 ? Math.floor(prizePool / winners.length) : 0;

  for (const winner of winners) {
    if (splitPrize <= 0) continue;

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
      description: isTie ? "Tournament prize (tie split)" : "Tournament prize",
    });

    if (updatedUser) {
      io.to(`user:${winner.playerId}`).emit("wallet:updated", {
        walletBalance: updatedUser.walletBalance,
      });
    }
  }

  await Tournament.findByIdAndUpdate(match.tournament, {
    status: "completed",
    "result.isTie": isTie,
    ...(!isTie && winners[0] ? { "result.winner": winners[0].playerId } : {}),
  });

  io.to(`game:${gameId}`).to(`tournament:${tournamentRoomId}`).emit("blackjack:tournament-over", {
    tournamentId: tournamentRoomId,
    winner: isTie ? null : (winners[0] ?? null),
    winners: isTie ? winners : null,
    isTie,
    splitPrize: isTie ? splitPrize : null,
    finalLeaderboard: leaderboard,
    prize: prizePool,
  });

  getIO().emit("tournament:status-changed", { tournamentId: tournamentRoomId, status: "completed" });
}

async function createNextStage(
  io: Server,
  prevGameId: string,
  match: any,
  currentStage: number,
  advancingPlayerIds: string[],
  tournamentRoomId: string
): Promise<void> {
  const users = await User.find({ _id: { $in: advancingPlayerIds } })
    .select("_id username fullName")
    .lean() as { _id: Types.ObjectId; username?: string; fullName?: string }[];

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
    startedAt: new Date(),
  });

  const newGameId = (newMatch._id as Types.ObjectId).toString();

  blackjackEngine.createGame(newGameId, players);
  const newState = blackjackEngine.startBettingPhase(newGameId);

  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId: newGameId },
    {
      $set: {
        status: "active",
        stateSnapshot: newState,
        leaderboard: blackjackEngine.getLeaderboard(newGameId),
        lastAction: "betting",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Match.findByIdAndUpdate(newMatch._id, { "matchData.gameId": newGameId });

  await Tournament.findByIdAndUpdate(match.tournament, {
    "matchData.currentGameId": newGameId,
    "matchData.currentStage": currentStage + 1,
    "matchData.advancingCount": getAdvancingCount(advancingPlayerIds.length),
  });

  io.to(`game:${prevGameId}`).to(`tournament:${tournamentRoomId}`).emit("blackjack:next-stage", {
    tournamentId: tournamentRoomId,
    gameId: newGameId,
    stage: currentStage + 1,
    players: advancingPlayerIds,
  });
}
