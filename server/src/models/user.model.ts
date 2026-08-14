import { Schema, model, Document } from "mongoose";

export type UserRole = "player" | "admin" | "moderator";

export interface IUserElo {
  blackjack: number;
  trivia: number;
}

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
  lastDailyBonus?: Date;
  elo: IUserElo;
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
    lastDailyBonus: {
      type: Date,
      default: null
    },
    elo: {
      blackjack: { type: Number, default: 1200, min: 100 },
      trivia: { type: Number, default: 1200, min: 100 },
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