import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "player" | "admin" | "moderator";

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  avatarUrl?: string;
  role: UserRole;
  walletBalance: number;
  isActive: boolean;
  games: string[];
  groups: Types.ObjectId[];
  lastDailyBonus?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["player", "admin", "moderator"],
      default: "player"
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    games: {
      type: [String],
      default: []
    },
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group"
      }
    ],
    lastDailyBonus: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
const User = model<IUser>("User", userSchema);

export default User;