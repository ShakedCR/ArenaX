import { Schema, model, Document, Types } from "mongoose";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "entry_fee"
  | "prize"
  | "refund";

export type TransactionStatus = "pending" | "completed" | "failed";

export interface ITransaction extends Document {
  user: Types.ObjectId;
  tournament?: Types.ObjectId;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament"
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "entry_fee", "prize", "refund"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed"
    },
    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Transaction = model<ITransaction>("Transaction", transactionSchema);

export default Transaction;