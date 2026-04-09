import { Response } from "express";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const getMyWallet = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const user = await User.findById(req.userId).select(
      "fullName username email walletBalance"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json({
      wallet: {
        userId: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    return res.status(500).json({
      message: "Server error while fetching wallet"
    });
  }
};

export const depositToWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Amount must be a positive number"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.walletBalance += amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      amount,
      type: "deposit",
      status: "completed",
      description: description || "Wallet deposit"
    });

    return res.status(200).json({
      message: "Deposit completed successfully",
      walletBalance: user.walletBalance,
      transaction
    });
  } catch (error) {
    console.error("Deposit error:", error);

    return res.status(500).json({
      message: "Server error while depositing funds"
    });
  }
};

export const withdrawFromWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Amount must be a positive number"
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({
        message: "Insufficient wallet balance"
      });
    }

    user.walletBalance -= amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      amount,
      type: "withdrawal",
      status: "completed",
      description: description || "Wallet withdrawal"
    });

    return res.status(200).json({
      message: "Withdrawal completed successfully",
      walletBalance: user.walletBalance,
      transaction
    });
  } catch (error) {
    console.error("Withdrawal error:", error);

    return res.status(500).json({
      message: "Server error while withdrawing funds"
    });
  }
};