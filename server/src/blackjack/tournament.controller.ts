import { Response } from "express";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import Tournament from "../models/tournament.model";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { getIO } from "../socket";
import { TournamentService } from "../services/tournament.service";
import { ApiResponseHandler } from "../utils/api-response";
import { getAdvancingCount } from "../utils/tournament.utils";
import { deleteDocumentChunks } from "../services/rag.service";
import { createBlackjackGame, generateUniqueInviteCode } from "./game.service";

const isTournamentCreator = (createdBy: Types.ObjectId | string, userId: string): boolean =>
  createdBy.toString() === userId;

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const shuffleArray = <T>(arr: T[]): T[] => {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

export const createTournament = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, gameTitle, gameMode, platform, format,
      entryFee, prizePool, maxParticipants, startDate, endDate,
      settings, isPrivate, privatePassword
    } = req.body;

    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!title || !gameTitle || !format || !maxParticipants || !startDate)
      return res.status(400).json({ message: "Missing required fields" });
    if (isPrivate === true && (!privatePassword || String(privatePassword).trim().length < 4))
      return res.status(400).json({ message: "Private tournaments must include a password (min 4 characters)" });
    if (gameTitle === "Blackjack" && (Number(maxParticipants) < 2 || Number(maxParticipants) > 6))
      return res.status(400).json({ message: "Blackjack tournaments support 2 to 6 players" });

    const hashedPassword = isPrivate ? await bcrypt.hash(String(privatePassword), 10) : "";
    const inviteCode = await generateUniqueInviteCode();
    const tournament = await Tournament.create({
      title, description, inviteCode, gameTitle, gameMode, platform, format,
      entryFee: entryFee ?? 0, prizePool: prizePool ?? 0, maxParticipants,
      startDate, endDate, settings, createdBy: req.userId, participants: [new Types.ObjectId(req.userId)],
      status: "draft", isPrivate: isPrivate ?? false,
      privatePassword: hashedPassword
    });

    // Notify all lobby users about the new tournament
    getIO().emit("tournament:created", { tournament });

    return res.status(201).json({ message: "Tournament created successfully", tournament });
  } catch (error) {
    console.error("Create tournament error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllTournaments = async (_req: AuthRequest, res: Response) => {
  try {
    const tournaments = await Tournament.find({ isPrivate: { $ne: true } })
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
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const tournaments = await Tournament.find({
      $or: [{ createdBy: req.userId }, { participants: new Types.ObjectId(req.userId) }]
    })
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl")
      .sort({ createdAt: -1 });

    const safeTournaments = tournaments.map(t => {
      const obj = t.toObject() as any;
      if (t.createdBy?._id?.toString() !== req.userId) delete obj.privatePassword;
      return obj;
    });

    return res.status(200).json({ tournaments: safeTournaments });
  } catch (error) {
    console.error("Get my tournaments error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTournamentById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id)
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    return res.status(200).json({ tournament });
  } catch (error) {
    console.error("Get tournament error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const joinTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (tournament.isPrivate)
      return res.status(403).json({ message: "This tournament is private. Use invite link and password to join." });
    if (tournament.status !== "open")
      return res.status(400).json({ message: "Tournament is not open for registration" });

    const userObjectId = new Types.ObjectId(req.userId);

    // Distinguish the common failure cases up front using the document already in hand,
    // before attempting the atomic participant-add below. The atomic update remains the
    // sole authoritative, concurrency-safe gate — these are best-effort early, clearer messages.
    const alreadyParticipant = tournament.participants.some(p => p.toString() === req.userId);
    if (alreadyParticipant) return res.status(400).json({ message: "User already joined this tournament" });
    if (tournament.participants.length >= tournament.maxParticipants)
      return res.status(400).json({ message: "Tournament is full" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (tournament.entryFee > 0 && user.walletBalance < tournament.entryFee)
      return res.status(400).json({ message: "Insufficient wallet balance to join this tournament" });

    // Atomically add participant — single DB operation prevents race-condition duplicates
    const updateOps: Record<string, any> = { $push: { participants: userObjectId } };
    if (tournament.entryFee > 0) updateOps.$inc = { prizePool: tournament.entryFee };

    const joined = await Tournament.findOneAndUpdate(
      {
        _id: id,
        status: "open",
        participants: { $ne: userObjectId },
        $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] },
      },
      updateOps,
      { new: true }
    );

    if (!joined) {
      // Rare race between the checks above and this atomic update — re-read to report
      // accurately instead of assuming duplicate-join.
      const current = await Tournament.findById(id).select("participants maxParticipants status");
      if (current?.participants.some(p => p.toString() === req.userId))
        return res.status(400).json({ message: "User already joined this tournament" });
      if (current && current.participants.length >= current.maxParticipants)
        return res.status(400).json({ message: "Tournament is full" });
      if (current && current.status !== "open")
        return res.status(400).json({ message: "Tournament is not open for registration" });
      return res.status(400).json({ message: "Unable to join tournament" });
    }

    if (tournament.entryFee > 0) {
      const deducted = await User.findOneAndUpdate(
        { _id: req.userId, walletBalance: { $gte: tournament.entryFee } },
        { $inc: { walletBalance: -tournament.entryFee } },
        { new: true }
      ).select("walletBalance");

      if (!deducted) {
        await Tournament.findByIdAndUpdate(id, {
          $pull: { participants: userObjectId },
          $inc: { prizePool: -tournament.entryFee },
        });
        return res.status(400).json({ message: "Insufficient wallet balance to join this tournament" });
      }

      await Transaction.create({
        user: user._id, tournament: tournament._id,
        amount: tournament.entryFee, type: "entry_fee", status: "completed",
        description: `Entry fee for tournament: ${tournament.title}`
      });
      getIO().to(`user:${req.userId}`).emit("wallet:updated", { walletBalance: deducted.walletBalance });
    }

    getIO().emit("tournament:participant-added", {
      tournamentId: id,
      participant: {
        _id: (user._id as Types.ObjectId).toString(),
        username: (user as any).username,
        fullName: (user as any).fullName,
      },
    });

    return res.status(200).json({ message: "Joined tournament successfully", walletBalance: user.walletBalance, tournament: joined });
  } catch (error) {
    console.error("Join tournament error:", error);
    return res.status(500).json({ message: "Server error while joining tournament" });
  }
};

export const updateTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });

    const allowedFields = [
      "title", "description", "gameTitle", "gameMode", "platform", "format",
      "entryFee", "prizePool", "maxParticipants", "startDate", "endDate", "settings", "status", "isPrivate"
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) (tournament as any)[field] = req.body[field];
    });

    if (req.body.isPrivate === true) {
      if (req.body.privatePassword !== undefined && String(req.body.privatePassword).trim().length >= 4) {
        tournament.privatePassword = await bcrypt.hash(String(req.body.privatePassword), 10);
      } else if (!tournament.privatePassword) {
        return res.status(400).json({ message: "Private tournaments must include a password (min 4 characters)" });
      }
    }
    if (req.body.isPrivate === false) tournament.privatePassword = "";

    await tournament.save();
    const safeTournament = await Tournament.findById(id)
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    return res.status(200).json({ message: "Tournament updated", tournament: safeTournament });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });

    await Tournament.findByIdAndDelete(id);
    await deleteDocumentChunks(id);
    return res.status(200).json({ message: "Tournament deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const openTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });
    if (tournament.status !== "draft")
      return res.status(400).json({ message: "Only draft tournaments can be opened" });

    tournament.status = "open";
    await tournament.save();

    // Notify all lobby users that a tournament is now open for registration
    getIO().emit("tournament:opened", { tournamentId: id });

    return res.json({ message: "Tournament opened", tournament });
  } catch (error) {
    console.error("Open error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const startTournament = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });
    if (tournament.status !== "open")
      return res.status(400).json({ message: "Tournament must be open" });
    if (tournament.participants.length < 2)
      return res.status(400).json({ message: "Not enough players" });

    tournament.status = "ongoing";
    await tournament.save();

    if (tournament.gameTitle === "Blackjack") {
      const shuffledIds = shuffleArray(
        tournament.participants.map(p => p.toString())
      );

      // Stage 1 — all players at one table
      const { gameId } = await createBlackjackGame(
        tournament._id as Types.ObjectId,
        shuffledIds,
        1
      );

      // Store tournament metadata for stage progression
      await Tournament.findByIdAndUpdate(id, {
        "matchData.currentGameId": gameId,
        "matchData.currentStage": 1,
        "matchData.advancingCount": getAdvancingCount(shuffledIds.length),
      });

      // Notify all players in the waiting room
      getIO().to(`tournament:${id}`).emit("blackjack:tournament-started", {
        tournamentId: id,
        gameId,
        stage: 1,
        playerCount: shuffledIds.length,
      });

      // Notify everyone (Lobby, TournamentsList) that this tournament is now ongoing
      getIO().emit("tournament:status-changed", { tournamentId: id, status: "ongoing" });

      return res.json({ message: "Tournament started", gameId, stage: 1 });
    }

    return res.json({ message: "Tournament started" });
  } catch (error) {
    console.error("Start error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTournamentInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });

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

export const getTournamentByInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const inviteCode = req.params.inviteCode as string;
    const tournament = await Tournament.findOne({ inviteCode })
      .select("-privatePassword")
      .populate("createdBy", "fullName username email")
      .populate("participants", "fullName username email avatarUrl");

    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    return res.json({ tournament });
  } catch (error) {
    console.error("Get tournament by invite code error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const joinTournamentByInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const inviteCode = req.params.inviteCode as string;
    const { privatePassword } = req.body;

    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const tournament = await Tournament.findOne({ inviteCode });
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    
    // Allow creator to join draft private tournaments via invite link
    const isCreator = isTournamentCreator(tournament.createdBy, req.userId);
    const canCreatorJoinDraft = tournament.status === "draft" && tournament.isPrivate === true && isCreator;

    if (tournament.status !== "open" && !canCreatorJoinDraft) {
      return res.status(400).json({ message: "Tournament is not open for registration" });
    }

    if (tournament.isPrivate) {
      const passwordMatch = privatePassword && tournament.privatePassword
        ? await bcrypt.compare(String(privatePassword), tournament.privatePassword)
        : false;
      if (!passwordMatch)
        return res.status(403).json({ message: "Invalid private tournament password" });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const tournamentId = (tournament._id as Types.ObjectId).toString();

    // Distinguish the common failure cases up front using the document already in hand,
    // before attempting the atomic participant-add below. The atomic update remains the
    // sole authoritative, concurrency-safe gate — these are best-effort early, clearer messages.
    const alreadyParticipant = tournament.participants.some(p => p.toString() === req.userId);
    if (alreadyParticipant) return res.status(400).json({ message: "User already joined this tournament" });
    if (tournament.participants.length >= tournament.maxParticipants)
      return res.status(400).json({ message: "Tournament is full" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (tournament.entryFee > 0 && user.walletBalance < tournament.entryFee)
      return res.status(400).json({ message: "Insufficient wallet balance to join this tournament" });

    // Atomically add participant — single DB operation prevents race-condition duplicates
    const updateOps: Record<string, any> = { $push: { participants: userObjectId } };
    if (tournament.entryFee > 0) updateOps.$inc = { prizePool: tournament.entryFee };

    const joined = await Tournament.findOneAndUpdate(
      {
        _id: tournament._id,
        status: "open",
        participants: { $ne: userObjectId },
        $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] },
      },
      updateOps,
      { new: true }
    );

    if (!joined) {
      // Rare race between the checks above and this atomic update — re-read to report
      // accurately instead of assuming duplicate-join.
      const current = await Tournament.findById(tournament._id).select("participants maxParticipants status");
      if (current?.participants.some(p => p.toString() === req.userId))
        return res.status(400).json({ message: "User already joined this tournament" });
      if (current && current.participants.length >= current.maxParticipants)
        return res.status(400).json({ message: "Tournament is full" });
      if (current && current.status !== "open")
        return res.status(400).json({ message: "Tournament is not open for registration" });
      return res.status(400).json({ message: "Unable to join tournament" });
    }

    if (tournament.entryFee > 0) {
      const deducted = await User.findOneAndUpdate(
        { _id: req.userId, walletBalance: { $gte: tournament.entryFee } },
        { $inc: { walletBalance: -tournament.entryFee } },
        { new: true }
      ).select("walletBalance");

      if (!deducted) {
        await Tournament.findByIdAndUpdate(tournament._id, {
          $pull: { participants: userObjectId },
          $inc: { prizePool: -tournament.entryFee },
        });
        return res.status(400).json({ message: "Insufficient wallet balance to join this tournament" });
      }

      await Transaction.create({
        user: user._id, tournament: tournament._id,
        amount: tournament.entryFee, type: "entry_fee", status: "completed",
        description: `Entry fee for tournament: ${tournament.title}`
      });
      getIO().to(`user:${req.userId}`).emit("wallet:updated", { walletBalance: deducted.walletBalance });
    }

    getIO().emit("tournament:participant-added", {
      tournamentId,
      participant: {
        _id: (user._id as Types.ObjectId).toString(),
        username: (user as any).username,
        fullName: (user as any).fullName,
      },
    });

    return res.status(200).json({
      message: "Joined tournament successfully via invite link",
      walletBalance: user.walletBalance, tournament: joined
    });
  } catch (error) {
    console.error("Join tournament by invite code error:", error);
    return res.status(500).json({ message: "Server error while joining tournament via invite link" });
  }
};

export const regenerateTournamentInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid tournament ID" });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (!isTournamentCreator(tournament.createdBy, req.userId))
      return res.status(403).json({ message: "Forbidden" });

    const newInviteCode = await generateUniqueInviteCode();
    tournament.inviteCode = newInviteCode;
    await tournament.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.status(200).json({
      message: "Invite code regenerated successfully",
      inviteCode: tournament.inviteCode,
      inviteLink: `${clientUrl}/tournaments/join/${tournament.inviteCode}`
    });
  } catch (error) {
    console.error("Regenerate invite code error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



