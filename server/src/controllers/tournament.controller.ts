import { Response } from "express";
import Tournament from "../models/tournament.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const createTournament = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      gameTitle,
      gameMode,
      platform,
      format,
      entryFee,
      prizePool,
      maxParticipants,
      startDate,
      endDate,
      settings
    } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!title || !gameTitle || !format || !maxParticipants || !startDate) {
      return res.status(400).json({
        message: "title, gameTitle, format, maxParticipants and startDate are required"
      });
    }

    const tournament = await Tournament.create({
      title,
      description,
      gameTitle,
      gameMode,
      platform,
      format,
      entryFee: entryFee ?? 0,
      prizePool: prizePool ?? 0,
      maxParticipants,
      startDate,
      endDate,
      settings,
      createdBy: req.userId,
      participants: [],
      status: "draft"
    });

    return res.status(201).json({
      message: "Tournament created successfully",
      tournament
    });
  } catch (error) {
    console.error("Create tournament error:", error);

    return res.status(500).json({
      message: "Server error while creating tournament"
    });
  }
};

export const getAllTournaments = async (_req: AuthRequest, res: Response) => {
  try {
    const tournaments = await Tournament.find()
      .populate("createdBy", "fullName username email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      tournaments
    });
  } catch (error) {
    console.error("Get all tournaments error:", error);

    return res.status(500).json({
      message: "Server error while fetching tournaments"
    });
  }
};

export const getTournamentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id)
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found"
      });
    }

    return res.status(200).json({
      tournament
    });
  } catch (error) {
    console.error("Get tournament by id error:", error);

    return res.status(500).json({
      message: "Server error while fetching tournament"
    });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found"
      });
    }

    const isAlreadyParticipant = tournament.participants.some(
      (participantId) => participantId.toString() === req.userId
    );

    if (isAlreadyParticipant) {
      return res.status(400).json({
        message: "User already joined this tournament"
      });
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({
        message: "Tournament is full"
      });
    }

    tournament.participants.push(req.userId as any);
    await tournament.save();

    return res.status(200).json({
      message: "Joined tournament successfully",
      tournament
    });
  } catch (error) {
    console.error("Join tournament error:", error);

    return res.status(500).json({
      message: "Server error while joining tournament"
    });
  }
};