import { Response } from "express";
import { Types } from "mongoose";
import Match from "../models/match.model";
import Tournament from "../models/tournament.model";
import { AuthRequest } from "../middleware/auth.middleware";

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export const getTournamentMatches = async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId as string;

    if (!isValidObjectId(tournamentId)) {
      return res.status(400).json({
        message: "Invalid tournament ID"
      });
    }

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

const createNextRoundMatches = async (
  tournamentId: Types.ObjectId,
  gameTitle: string,
  round: number,
  winners: Types.ObjectId[]
) => {
  const matchesToCreate = [];

  for (let i = 0; i < winners.length; i += 2) {
    const playerOne = winners[i];
    const playerTwo = winners[i + 1];

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
    const matchId = req.params.matchId as string;
    const { winnerId, score, metadata } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!isValidObjectId(matchId)) {
      return res.status(400).json({
        message: "Invalid match ID"
      });
    }

    if (!winnerId || !isValidObjectId(winnerId)) {
      return res.status(400).json({
        message: "Valid winnerId is required"
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

    if (tournament.status !== "ongoing") {
      return res.status(400).json({
        message: "Match results can only be reported for ongoing tournaments"
      });
    }

    if (match.status === "completed") {
      return res.status(400).json({
        message: "Match result was already reported"
      });
    }

    if (match.participants.length < 2) {
      return res.status(400).json({
        message: "Cannot manually report result for a BYE match"
      });
    }

    const winnerObjectId = new Types.ObjectId(winnerId);

    const isWinnerParticipant = match.participants.some((participantId) =>
      participantId.equals(winnerObjectId)
    );

    if (!isWinnerParticipant) {
      return res.status(400).json({
        message: "winnerId must belong to one of the match participants"
      });
    }

    match.status = "completed";
    match.endedAt = new Date();
    match.result = {
      winner: winnerObjectId,
      score: score || "",
      metadata: metadata || {}
    };

    await match.save();

    const currentRoundMatches = await Match.find({
      tournament: tournament._id,
      round: match.round
    }).sort({ createdAt: 1 });

    const isRoundCompleted = currentRoundMatches.every(
      (currentMatch) => currentMatch.status === "completed"
    );

    if (!isRoundCompleted) {
      return res.status(200).json({
        message: "Match result reported successfully",
        match,
        roundCompleted: false
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
        roundCompleted: true,
        tournamentCompleted: true,
        championId: winners[0],
        tournament
      });
    }

    const nextRound = match.round + 1;

    const existingNextRoundMatches = await Match.find({
      tournament: tournament._id,
      round: nextRound
    });

    if (existingNextRoundMatches.length > 0) {
      return res.status(200).json({
        message: "Match result reported successfully. Next round already exists.",
        match,
        roundCompleted: true,
        nextRound,
        nextRoundMatches: existingNextRoundMatches
      });
    }

    const nextRoundMatches = await createNextRoundMatches(
      tournament._id as Types.ObjectId,
      tournament.gameTitle,
      nextRound,
      winners
    );

    return res.status(200).json({
      message: "Match result reported successfully. Next round generated.",
      match,
      roundCompleted: true,
      nextRound,
      nextRoundMatches
    });
  } catch (error) {
    console.error("Report match result error:", error);

    return res.status(500).json({
      message: "Server error while reporting match result"
    });
  }
};