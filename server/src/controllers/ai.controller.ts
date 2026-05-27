import { Response } from "express";
import { Types } from "mongoose";
import Match from "../models/match.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { analyzeMatchById } from "../services/ai-match-analysis.service";

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export const analyzeMatch = async (req: AuthRequest, res: Response) => {
  try {
    const matchId = req.params.matchId as string;

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

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        message: "Match not found"
      });
    }

    const isParticipant = match.participants.some(
      (participantId) => participantId.toString() === req.userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Only match participants can request AI analysis"
      });
    }

    const analysis = await analyzeMatchById(matchId);

    return res.status(200).json({
      message: "AI match analysis completed",
      analysis
    });
  } catch (error: any) {
    if (error.message === "MATCH_NOT_COMPLETED") {
      return res.status(400).json({
        message: "AI analysis is available only after the match is completed"
      });
    }

    if (error.message === "MATCH_NOT_FOUND") {
      return res.status(404).json({
        message: "Match not found"
      });
    }

    console.error("AI match analysis error:", error);

    return res.status(500).json({
      message: "Server error while analyzing match"
    });
  }
};