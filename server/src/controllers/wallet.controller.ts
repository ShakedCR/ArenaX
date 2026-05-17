import { Response } from "express";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { AuthRequest } from "../middleware/auth.middleware";

const DAILY_BONUS_AMOUNT = 50;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const hasClaimedInLast24Hours = (lastDailyBonus?: Date): boolean => {
  if (!lastDailyBonus) return false;
  return Date.now() - new Date(lastDailyBonus).getTime() < TWENTY_FOUR_HOURS_MS;
};

const buildWalletResponse = (user: any) => ({
  userId: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  walletBalance: user.walletBalance,
  canClaimDailyBonus: !hasClaimedInLast24Hours(user.lastDailyBonus)
});

const normalizeDescription = (
  description: unknown,
  fallback: string
): string => {
  if (typeof description === "string" && description.trim() !== "") {
    return description.trim();
  }

  return fallback;
};

export const getMyWallet = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const user = await User.findById(req.userId).select(
      "fullName username email walletBalance lastDailyBonus"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json({
      wallet: buildWalletResponse(user)
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

    if (!Number.isFinite(amount) || amount <= 0) {
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
      description: normalizeDescription(description, "Wallet deposit")
    });

    return res.status(200).json({
      message: "Deposit completed successfully",
      wallet: buildWalletResponse(user),
      transaction
    });
  } catch (error) {
    console.error("Deposit error:", error);

    return res.status(500).json({
      message: "Server error while depositing funds"
    });
  }
};

export const claimDailyBonus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (hasClaimedInLast24Hours(user.lastDailyBonus)) {
      return res.status(400).json({ message: "Daily bonus already claimed today" });
    }

    user.walletBalance += DAILY_BONUS_AMOUNT;
    user.lastDailyBonus = new Date();
    await user.save();

    await Transaction.create({
      user: user._id,
      amount: DAILY_BONUS_AMOUNT,
      type: "deposit",
      status: "completed",
      description: "Daily bonus"
    });

    return res.status(200).json({
      message: "Daily bonus claimed successfully",
      wallet: buildWalletResponse(user)
    });
  } catch (error) {
    console.error("Daily bonus error:", error);
    return res.status(500).json({ message: "Server error while claiming daily bonus" });
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

    if (!Number.isFinite(amount) || amount <= 0) {
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
      description: normalizeDescription(description, "Wallet withdrawal")
    });

    return res.status(200).json({
      message: "Withdrawal completed successfully",
      wallet: buildWalletResponse(user),
      transaction
    });
  } catch (error) {
    console.error("Withdrawal error:", error);

    return res.status(500).json({
      message: "Server error while withdrawing funds"
    });
  }
};