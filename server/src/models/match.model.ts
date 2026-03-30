import { Schema, model, Document, Types } from "mongoose";

export type MatchStatus =
  | "scheduled"
  | "pending"
  | "live"
  | "completed"
  | "cancelled";

export interface IMatchResult {
  winner?: Types.ObjectId;
  score?: string;
  metadata?: Record<string, unknown>;
}

export interface IMatch extends Document {
  tournament: Types.ObjectId;
  gameTitle: string;
  round: number;
  participants: Types.ObjectId[];
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  status: MatchStatus;
  result?: IMatchResult;
  matchData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const matchSchema = new Schema<IMatch>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true
    },
    gameTitle: {
      type: String,
      required: true,
      trim: true
    },
    round: {
      type: Number,
      required: true,
      min: 1
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    scheduledAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ["scheduled", "pending", "live", "completed", "cancelled"],
      default: "scheduled"
    },
    result: {
      winner: {
        type: Schema.Types.ObjectId,
        ref: "User"
      },
      score: {
        type: String,
        default: ""
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {}
      }
    },
    matchData: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

matchSchema.index({ tournament: 1, round: 1 });
matchSchema.index({ status: 1 });
const Match = model<IMatch>("Match", matchSchema);

export default Match;