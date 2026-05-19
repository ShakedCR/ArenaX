import { Schema, model, Document, Types } from "mongoose";

export type TournamentStatus = "draft" | "open" | "ongoing" | "completed" | "cancelled";

export type TournamentFormat = "single_elimination" | "double_elimination" | "round_robin" | "swiss" | "league";

export interface ITournamentSettings {
  platform?: string;
  serverRegion?: string;
  mapPool?: string[];
  mode?: string;
  bestOf?: number;
  customRules?: string[];
}

export interface ITournament extends Document {
  title: string;
  inviteCode: string;
  description?: string;
  gameTitle: string;
  gameMode?: string;
  platform?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  isPrivate: boolean;
  privatePassword?: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  participants: Types.ObjectId[];
  participantCount: number;
  createdBy: Types.ObjectId;
  group?: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  settings?: ITournamentSettings;
  matchData?: {
    currentGameId?: string;
    currentStage?: number;
    advancingCount?: number;
  };
  qrUrl?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: { type: String, required: true, trim: true },
    inviteCode: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    gameTitle: { type: String, required: true, trim: true },
    gameMode: { type: String, default: "" },
    platform: { type: String, default: "" },
    format: {
      type: String,
      enum: ["single_elimination", "double_elimination", "round_robin", "swiss", "league"],
      default: "single_elimination"
    },
    status: {
      type: String,
      enum: ["draft", "open", "ongoing", "completed", "cancelled"],
      default: "draft"
    },
    isPrivate: { type: Boolean, default: false },
    privatePassword: { type: String, default: "" },
    entryFee: { type: Number, default: 0, min: 0 },
    prizePool: { type: Number, default: 0, min: 0 },
    maxParticipants: { type: Number, required: true, min: 2 },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    participantCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    settings: {
      platform: { type: String, default: "" },
      serverRegion: { type: String, default: "" },
      mapPool: { type: [String], default: [] },
      mode: { type: String, default: "" },
      bestOf: { type: Number, default: 1, min: 1 },
      customRules: { type: [String], default: [] }
    },
    matchData: {
      currentGameId: { type: String, default: "" },
      currentStage: { type: Number, default: 1 },
      advancingCount: { type: Number, default: 0 }
    },
    qrUrl: { type: String, default: "" },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Optimized indexes for common queries
tournamentSchema.index({ status: 1, createdAt: -1 });
tournamentSchema.index({ createdBy: 1 });
tournamentSchema.index({ inviteCode: 1 }, { unique: true });
tournamentSchema.index({ isPrivate: 1 });
tournamentSchema.index({ gameTitle: 1, status: 1 });
tournamentSchema.index({ deletedAt: 1 });

const Tournament = model<ITournament>("Tournament", tournamentSchema);
export default Tournament;