import { Response } from "express";
import { Types } from "mongoose";
import Tournament from "../models/tournament.model";
import Match from "../models/match.model";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";

/* ================= Helpers ================= */

const generateInviteCode = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `${randomPart}${timePart}`;
};

const generateUniqueInviteCode = async (): Promise<string> => {
  let inviteCode: string;
  let exists = true;

  while (exists) {
    inviteCode = generateInviteCode();
    exists = !!(await Tournament.exists({ inviteCode }));
  }

  return inviteCode!;
};

const isTournamentCreator = (
  createdBy: Types.ObjectId | string,
  userId: string
): boolean => createdBy.toString() === userId;

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const shuffleParticipants = (
  participants: Types.ObjectId[]
): Types.ObjectId[] => {
  const shuffled = [...participants];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/* ================= Controllers ================= */

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
      settings,
      isPrivate,
      privatePassword
    } = req.body;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!title || !gameTitle || !format || !maxParticipants || !startDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (
      isPrivate === true &&
      (!privatePassword || String(privatePassword).trim() === "")
    ) {
      return res.status(400).json({
        message: "Private tournaments must include a privatePassword"
      });
    }

    const inviteCode = await generateUniqueInviteCode();

    const tournament = await Tournament.create({
      title,
      description,
      inviteCode,
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
      status: "draft",
      isPrivate: isPrivate ?? false,
      privatePassword: isPrivate ? String(privatePassword) : ""
    });

    return res.status(201).json({
      message: "Tournament created successfully",
      tournament
    });
  } catch (error) {
    console.error("Create tournament error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllTournaments = async (_req: AuthRequest, res: Response) => {
  try {
    const tournaments = await Tournament.find({
      isPrivate: { $ne: true }
    })
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ tournaments });
  } catch (error) {
    console.error("Get tournaments error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getMyTournaments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tournaments = await Tournament.find({
      $or: [
        { createdBy: req.userId },
        { participants: new Types.ObjectId(req.userId) }
      ]
    })
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl")
      .sort({ createdAt: -1 });

    const safeTournaments = tournaments.map(t => {
      const obj = t.toObject() as any
      if (t.createdBy?._id?.toString() !== req.userId) {
        delete obj.privatePassword
      }
      return obj
    })

    return res.status(200).json({ tournaments: safeTournaments });
  } catch (error) {
    console.error("Get my tournaments error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
export const getTournamentById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id)
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    return res.status(200).json({ tournament });
  } catch (error) {
    console.error("Get tournament error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid tournament ID"
      });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found"
      });
    }

    if (tournament.isPrivate) {
      return res.status(403).json({
        message: "This tournament is private. Use invite link and password to join."
      });
    }

    if (tournament.status !== "open") {
      return res.status(400).json({
        message: "Tournament is not open for registration"
      });
    }

    const userObjectId = new Types.ObjectId(req.userId);

    const isAlreadyParticipant = tournament.participants.some((participantId) =>
      participantId.equals(userObjectId)
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

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (tournament.entryFee > 0) {
      if (user.walletBalance < tournament.entryFee) {
        return res.status(400).json({
          message: "Insufficient wallet balance to join this tournament"
        });
      }

      user.walletBalance -= tournament.entryFee;
      tournament.prizePool += tournament.entryFee;

      await user.save();

      await Transaction.create({
        user: user._id,
        tournament: tournament._id,
        amount: tournament.entryFee,
        type: "entry_fee",
        status: "completed",
        description: `Entry fee for tournament: ${tournament.title}`
      });
    }

    tournament.participants.push(userObjectId);
    await tournament.save();

    return res.status(200).json({
      message: "Joined tournament successfully",
      walletBalance: user.walletBalance,
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
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const allowedFields = [
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
      "status",
      "isPrivate"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (tournament as any)[field] = req.body[field];
      }
    });

    if (req.body.isPrivate === true) {
      if (
        req.body.privatePassword !== undefined &&
        String(req.body.privatePassword).trim() !== ""
      ) {
        tournament.privatePassword = String(req.body.privatePassword);
      } else if (!tournament.privatePassword) {
        return res.status(400).json({
          message: "Private tournaments must include a privatePassword"
        });
      }
    }

    if (req.body.isPrivate === false) {
      tournament.privatePassword = "";
    }

    await tournament.save();

    const safeTournament = await Tournament.findById(id)
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    return res.status(200).json({
      message: "Tournament updated",
      tournament: safeTournament
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Tournament.findByIdAndDelete(id);

    return res.status(200).json({ message: "Tournament deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const openTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (tournament.status !== "draft") {
      return res.status(400).json({
        message: "Only draft tournaments can be opened"
      });
    }

    tournament.status = "open";
    await tournament.save();

    return res.json({
      message: "Tournament opened",
      tournament
    });
  } catch (error) {
    console.error("Open error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const startTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (tournament.status !== "open") {
      return res.status(400).json({ message: "Tournament must be open" });
    }

    if (tournament.participants.length < 2) {
      return res.status(400).json({ message: "Not enough players" });
    }

    const shuffled = shuffleParticipants(
      tournament.participants as Types.ObjectId[]
    );

    const matches = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];

      if (!p2) {
        matches.push({
          tournament: tournament._id,
          gameTitle: tournament.gameTitle,
          round: 1,
          participants: [p1],
          status: "completed",
          result: {
            winner: p1,
            score: "BYE"
          }
        });
      } else {
        matches.push({
          tournament: tournament._id,
          gameTitle: tournament.gameTitle,
          round: 1,
          participants: [p1, p2],
          status: "scheduled"
        });
      }
    }

    const createdMatches = await Match.insertMany(matches);

    tournament.status = "ongoing";
    await tournament.save();

    return res.json({
      message: "Tournament started",
      matches: createdMatches
    });
  } catch (error) {
    console.error("Start error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ================= Invite ================= */

export const getTournamentInviteLink = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    return res.json({
      inviteCode: tournament.inviteCode,
      inviteLink: `${clientUrl}/tournaments/join/${tournament.inviteCode}`
    });
  } catch (error) {
    console.error("Get tournament invite link error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTournamentByInviteCode = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const inviteCode = req.params.inviteCode as string;

    const tournament = await Tournament.findOne({ inviteCode })
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    return res.json({ tournament });
  } catch (error) {
    console.error("Get tournament by invite code error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const joinTournamentByInviteCode = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const inviteCode = req.params.inviteCode as string;
    const { privatePassword } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const tournament = await Tournament.findOne({ inviteCode });

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found"
      });
    }

    if (tournament.status !== "open") {
      return res.status(400).json({
        message: "Tournament is not open for registration"
      });
    }

    if (tournament.isPrivate) {
      if (!privatePassword || privatePassword !== tournament.privatePassword) {
        return res.status(403).json({
          message: "Invalid private tournament password"
        });
      }
    }

    const userObjectId = new Types.ObjectId(req.userId);

    const isAlreadyParticipant = tournament.participants.some((participantId) =>
      participantId.equals(userObjectId)
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

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (tournament.entryFee > 0) {
      if (user.walletBalance < tournament.entryFee) {
        return res.status(400).json({
          message: "Insufficient wallet balance to join this tournament"
        });
      }

      user.walletBalance -= tournament.entryFee;
      tournament.prizePool += tournament.entryFee;

      await user.save();

      await Transaction.create({
        user: user._id,
        tournament: tournament._id,
        amount: tournament.entryFee,
        type: "entry_fee",
        status: "completed",
        description: `Entry fee for tournament: ${tournament.title}`
      });
    }

    tournament.participants.push(userObjectId);
    await tournament.save();

    return res.status(200).json({
      message: "Joined tournament successfully via invite link",
      walletBalance: user.walletBalance,
      tournament
    });
  } catch (error) {
    console.error("Join tournament by invite code error:", error);

    return res.status(500).json({
      message: "Server error while joining tournament via invite link"
    });
  }
};

export const regenerateTournamentInviteCode = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (!isTournamentCreator(tournament.createdBy, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const newInviteCode = await generateUniqueInviteCode();
    tournament.inviteCode = newInviteCode;

    await tournament.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const inviteLink = `${clientUrl}/tournaments/join/${tournament.inviteCode}`;

    return res.status(200).json({
      message: "Invite code regenerated successfully",
      inviteCode: tournament.inviteCode,
      inviteLink
    });
  } catch (error) {
    console.error("Regenerate invite code error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};