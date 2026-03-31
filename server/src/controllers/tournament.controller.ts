import { Response } from "express";
import Tournament from "../models/tournament.model";
import { AuthRequest } from "../middleware/auth.middleware";
import Match from "../models/match.model";
import { Types } from "mongoose";

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

export const updateTournament = async (req: AuthRequest, res: Response) => {
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

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: only the tournament creator can update this tournament"
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "gameTitle",
      "gameMode",
      "platform",
      "format",
      "entryFee",
      "prizePool",
      "maxParticipants",
      "startDate",
      "endDate",
      "settings",
      "status"
    ];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        (tournament as any)[key] = req.body[key];
      }
    }

    await tournament.save();

    return res.status(200).json({
      message: "Tournament updated successfully",
      tournament
    });
  } catch (error) {
    console.error("Update tournament error:", error);

    return res.status(500).json({
      message: "Server error while updating tournament"
    });
  }
};

export const deleteTournament = async (req: AuthRequest, res: Response) => {
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

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: only the tournament creator can delete this tournament"
      });
    }

    await Tournament.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Tournament deleted successfully"
    });
  } catch (error) {
    console.error("Delete tournament error:", error);

    return res.status(500).json({
      message: "Server error while deleting tournament"
    });
  }
};

export const openTournament = async (req: AuthRequest, res: Response) => {
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

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: only the tournament creator can open this tournament"
      });
    }

    if (tournament.status !== "draft") {
      return res.status(400).json({
        message: "Only draft tournaments can be opened"
      });
    }

    tournament.status = "open";
    await tournament.save();

    return res.status(200).json({
      message: "Tournament is now open for registration",
      tournament
    });
  } catch (error) {
    console.error("Open tournament error:", error);

    return res.status(500).json({
      message: "Server error while opening tournament"
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

export const startTournament = async (req: AuthRequest, res: Response) => {
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

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: only the tournament creator can start this tournament"
      });
    }

    if (tournament.status !== "open") {
      return res.status(400).json({
        message: "Only open tournaments can be started"
      });
    }

    if (tournament.participants.length < 2) {
      return res.status(400).json({
        message: "At least 2 participants are required to start the tournament"
      });
    }

    const existingMatches = await Match.countDocuments({
      tournament: tournament._id
    });

    if (existingMatches > 0) {
      return res.status(400).json({
        message: "Matches for this tournament already exist"
      });
    }

    const shuffledParticipants = shuffleParticipants(
      tournament.participants as Types.ObjectId[]
    );

    const matchesToCreate = [];

    for (let i = 0; i < shuffledParticipants.length; i += 2) {
      const playerOne = shuffledParticipants[i];
      const playerTwo = shuffledParticipants[i + 1];

      if (!playerTwo) {
        matchesToCreate.push({
          tournament: tournament._id,
          gameTitle: tournament.gameTitle,
          round: 1,
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
          tournament: tournament._id,
          gameTitle: tournament.gameTitle,
          round: 1,
          participants: [playerOne, playerTwo],
          status: "scheduled"
        });
      }
    }

    const createdMatches = await Match.insertMany(matchesToCreate);

    tournament.status = "ongoing";
    await tournament.save();

    return res.status(200).json({
      message: "Tournament started successfully",
      tournament,
      matches: createdMatches
    });
  } catch (error) {
    console.error("Start tournament error:", error);

    return res.status(500).json({
      message: "Server error while starting tournament"
    });
  }
};