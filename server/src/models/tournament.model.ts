import { Schema, model, Document, Types } from "mongoose";

export type TournamentStatus =
  | "draft"
  | "open"
  | "ongoing"
  | "completed"
  | "cancelled";

export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "swiss"
  | "league";

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
  description?: string;
  gameTitle: string;
  gameMode?: string;
  platform?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  group?: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  settings?: ITournamentSettings;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    gameTitle: {
      type: String,
      required: true,
      trim: true
    },
    gameMode: {
      type: String,
      default: ""
    },
    platform: {
      type: String,
      default: ""
    },
    format: {
      type: String,
      enum: [
        "single_elimination",
        "double_elimination",
        "round_robin",
        "swiss",
        "league"
      ],
      default: "single_elimination"
    },
    status: {
      type: String,
      enum: ["draft", "open", "ongoing", "completed", "cancelled"],
      default: "draft"
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    prizePool: {
      type: Number,
      default: 0,
      min: 0
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 2
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group"
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    settings: {
      platform: { type: String, default: "" },
      serverRegion: { type: String, default: "" },
      mapPool: { type: [String], default: [] },
      mode: { type: String, default: "" },
      bestOf: { type: Number, default: 1, min: 1 },
      customRules: { type: [String], default: [] }
    }
  },
  {
    timestamps: true
  }
);

tournamentSchema.index({ gameTitle: 1, status: 1 });
tournamentSchema.index({ createdBy: 1 });
const Tournament = model<ITournament>("Tournament", tournamentSchema);

export default Tournament;