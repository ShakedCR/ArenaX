import { Response } from "express";
import { Types } from "mongoose";
import Match from "../models/match.model";
import Tournament from "../models/tournament.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const getTournamentMatches = async (req: AuthRequest, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const matches = await Match.find({ tournament: tournamentId })
      .populate("participants", "fullName username email avatarUrl")
      .populate("result.winner", "fullName username email avatarUrl")
      .sort({ round: 1, createdAt: 1 });

    return res.status(200).json({
      matches
    });
  } catch (error) {
    console.error("Get tournament matches error:", error);

    return res.status(500).json({
      message: "Server error while fetching matches"
    });
  }
};

const shuffleParticipants = (participants: Types.ObjectId[]): Types.ObjectId[] => {
  const shuffled = [...participants];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

const createNextRoundMatches = async (
  tournamentId: string,
  gameTitle: string,
  round: number,
  winners: Types.ObjectId[]
) => {
  const shuffledWinners = shuffleParticipants(winners);
  const matchesToCreate = [];

  for (let i = 0; i < shuffledWinners.length; i += 2) {
    const playerOne = shuffledWinners[i];
    const playerTwo = shuffledWinners[i + 1];

    if (!playerTwo) {
      matchesToCreate.push({
        tournament: tournamentId,
        gameTitle,
        round,
        participants: [playerOne],
        status: "completed",
        result: {
          winner: playerOne,
          score: "BYE",
          metadata: {
            autoAdvanced: true
          }
        }
      });
    } else {
      matchesToCreate.push({
        tournament: tournamentId,
        gameTitle,
        round,
        participants: [playerOne, playerTwo],
        status: "scheduled"
      });
    }
  }

  return Match.insertMany(matchesToCreate);
};

export const reportMatchResult = async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const { winnerId, score, metadata } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!winnerId) {
      return res.status(400).json({
        message: "winnerId is required"
      });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        message: "Match not found"
      });
    }

    const tournament = await Tournament.findById(match.tournament);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found"
      });
    }

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: only the tournament creator can report match results"
      });
    }

    if (match.status === "completed") {
      return res.status(400).json({
        message: "Match result was already reported"
      });
    }

    if (match.participants.length < 2) {
      return res.status(400).json({
        message: "Cannot manually report result for a match without two participants"
      });
    }

    const isWinnerParticipant = match.participants.some(
      (participantId) => participantId.toString() === winnerId
    );

    if (!isWinnerParticipant) {
      return res.status(400).json({
        message: "winnerId must belong to one of the match participants"
      });
    }

    match.status = "completed";
    match.endedAt = new Date();
    match.result = {
      winner: new Types.ObjectId(winnerId),
      score: score || "",
      metadata: metadata || {}
    };

    await match.save();

    const currentRoundMatches = await Match.find({
      tournament: tournament._id,
      round: match.round
    });

    const isRoundCompleted = currentRoundMatches.every(
      (currentMatch) => currentMatch.status === "completed"
    );

    if (!isRoundCompleted) {
      return res.status(200).json({
        message: "Match result reported successfully",
        match
      });
    }

    const winners = currentRoundMatches
      .map((currentMatch) => currentMatch.result?.winner)
      .filter(Boolean) as Types.ObjectId[];

    if (winners.length === 1) {
      tournament.status = "completed";
      await tournament.save();

      return res.status(200).json({
        message: "Match result reported successfully. Tournament completed.",
        match,
        championId: winners[0],
        tournament
      });
    }

    const nextRound = match.round + 1;

    const existingNextRoundMatches = await Match.countDocuments({
      tournament: tournament._id,
      round: nextRound
    });

    if (existingNextRoundMatches === 0) {
      await createNextRoundMatches(
        tournament._id.toString(),
        tournament.gameTitle,
        nextRound,
        winners
      );
    }

    return res.status(200).json({
      message: "Match result reported successfully. Next round generated.",
      match
    });
  } catch (error) {
    console.error("Report match result error:", error);

    return res.status(500).json({
      message: "Server error while reporting match result"
    });
  }
};