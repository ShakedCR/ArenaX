import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { AuthRequest } from "../middleware/auth.middleware";

const WELCOME_BONUS_AMOUNT = 1000;
const WELCOME_BONUS_DESCRIPTION = "Welcome bonus";

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const expiresIn: SignOptions["expiresIn"] =
    (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

  return jwt.sign({ userId }, secret, { expiresIn });
};

const buildSafeUser = (user: any) => {
  return {
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
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        message: "fullName, username, email and password are required"
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email or username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
      walletBalance: WELCOME_BONUS_AMOUNT
    });

    await Transaction.create({
      user: user._id,
      amount: WELCOME_BONUS_AMOUNT,
      type: "deposit",
      status: "completed",
      description: WELCOME_BONUS_DESCRIPTION
    });

    const token = generateToken(user._id.toString());
    const safeUser = buildSafeUser(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Server error during registration"
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const token = generateToken(user._id.toString());
    const safeUser = buildSafeUser(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login"
    });
  }
};

export const googleAuthSuccess = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({
        message: "Google authentication failed"
      });
    }

    const token = generateToken(user._id.toString());
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    return res.redirect(`${clientUrl}/auth/success?token=${token}`);
  } catch (error) {
    console.error("Google auth success error:", error);

    return res.status(500).json({
      message: "Server error during Google authentication"
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
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

    const safeUser = buildSafeUser(user);

    return res.status(200).json({
      user: safeUser
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      message: "Server error while fetching user"
    });
  }
};