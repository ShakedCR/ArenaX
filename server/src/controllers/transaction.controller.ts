import { Response } from "express";
import { Types } from "mongoose";
import Transaction from "../models/transaction.model";
import { AuthRequest } from "../middleware/auth.middleware";

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export const getMyTransactions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const transactions = await Transaction.find({
      user: req.userId
    })
      .populate("tournament", "title gameTitle status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      transactions
    });
  } catch (error) {
    console.error("Get my transactions error:", error);

    return res.status(500).json({
      message: "Server error while fetching transactions"
    });
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid transaction ID"
      });
    }

    const transaction = await Transaction.findById(id).populate(
      "tournament",
      "title gameTitle status"
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    if (transaction.user.toString() !== req.userId) {
      return res.status(403).json({
        message: "Forbidden: you can only view your own transactions"
      });
    }

    return res.status(200).json({
      transaction
    });
  } catch (error) {
    console.error("Get transaction by ID error:", error);

    return res.status(500).json({
      message: "Server error while fetching transaction"
    });
  }
};