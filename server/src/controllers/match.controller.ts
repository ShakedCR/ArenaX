import { Request, Response } from "express";
import Match from "../models/match.model";

export const getTournamentMatches = async (req: Request, res: Response) => {
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