import { Response } from "express";
import { Types } from "mongoose";
import User from "../models/user.model";
import Tournament from "../models/tournament.model";
import Match from "../models/match.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { uploadImageBuffer } from "../services/cloudinary.service";

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const buildSafeUser = (user: any) => ({
  id: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  role: user.role,
  walletBalance: user.walletBalance,
  isActive: user.isActive,
  games: user.games,
  groups: user.groups,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const canManageUser = (currentUserId: string, targetUserId: string): boolean => {
  return currentUserId === targetUserId;
};

export const getCurrentUserProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json({
      user: buildSafeUser(user)
    });
  } catch (error) {
    console.error("Get current user profile error:", error);

    return res.status(500).json({
      message: "Server error while fetching current user profile"
    });
  }
};

export const getAllUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select("-password -googleId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Server error while fetching users"
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const user = await User.findById(id).select("-password -googleId");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json({
      user
    });
  } catch (error) {
    console.error("Get user by ID error:", error);

    return res.status(500).json({
      message: "Server error while fetching user"
    });
  }
};

export const updateUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    if (!canManageUser(req.userId, id)) {
      return res.status(403).json({
        message: "Forbidden: you can only update your own profile"
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const allowedUpdates = ["fullName", "username", "games"];

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        (user as any)[key] = req.body[key];
      }
    }

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: buildSafeUser(user)
    });
  } catch (error: any) {
    console.error("Update user error:", error);

    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Username already exists"
      });
    }

    return res.status(500).json({
      message: "Server error while updating user"
    });
  }
};

export const deleteUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    if (!canManageUser(req.userId, id)) {
      return res.status(403).json({
        message: "Forbidden: you can only delete your own profile"
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "Server error while deleting user"
    });
  }
};

export const getUserTournaments = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const createdTournaments = await Tournament.find({ createdBy: id })
      .sort({ createdAt: -1 });

    const joinedTournaments = await Tournament.find({
      participants: new Types.ObjectId(id)
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      createdTournaments,
      joinedTournaments
    });
  } catch (error) {
    console.error("Get user tournaments error:", error);

    return res.status(500).json({
      message: "Server error while fetching user tournaments"
    });
  }
};

export const getUserMatches = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const matches = await Match.find({
      participants: new Types.ObjectId(id)
    })
      .populate("tournament", "title gameTitle status")
      .populate("participants", "fullName username email avatarUrl")
      .populate("result.winner", "fullName username email avatarUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      matches
    });
  } catch (error) {
    console.error("Get user matches error:", error);

    return res.status(500).json({
      message: "Server error while fetching user matches"
    });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const userObjectId = new Types.ObjectId(id);

    const totalMatches = await Match.countDocuments({
      participants: userObjectId
    });

    const wins = await Match.countDocuments({
      "result.winner": userObjectId
    });

    const createdTournaments = await Tournament.countDocuments({
      createdBy: userObjectId
    });

    const joinedTournaments = await Tournament.countDocuments({
      participants: userObjectId
    });

    const winRate = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      stats: {
        totalMatches,
        wins,
        losses: totalMatches - wins,
        winRate,
        createdTournaments,
        joinedTournaments
      }
    });
  } catch (error) {
    console.error("Get user stats error:", error);

    return res.status(500).json({
      message: "Server error while fetching user stats"
    });
  }
};

export const updateUserAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!canManageUser(req.userId, id)) {
      return res.status(403).json({ message: "Forbidden: you can only update your own profile" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatarUrl = await uploadImageBuffer(file.buffer);
    await user.save();

    return res.status(200).json({
      message: "Avatar updated successfully",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return res.status(500).json({ message: "Server error while updating avatar" });
  }
};