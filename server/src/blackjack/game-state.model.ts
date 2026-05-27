import { Document, Schema, model } from "mongoose";

export interface IBlackjackLeaderboardItem {
    playerId: string;
    tokens: number;
    rank: number;
}

export interface IBlackjackGameStateDocument extends Document {
    gameId: string;
    status: "active" | "completed";
    stateSnapshot: Record<string, unknown>;
    leaderboard: IBlackjackLeaderboardItem[];
    lastAction: string;
    createdAt: Date;
    updatedAt: Date;
}

const blackjackGameStateSchema = new Schema<IBlackjackGameStateDocument>(
    {
        gameId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },
        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active"
        },
        stateSnapshot: {
            type: Schema.Types.Mixed,
            required: true,
            default: {}
        },
        leaderboard: [
            {
                playerId: { type: String, required: true },
                tokens: { type: Number, required: true },
                rank: { type: Number, required: true }
            }
        ],
        lastAction: {
            type: String,
            required: true,
            default: "start"
        }
    },
    {
        timestamps: true
    }
);

const BlackjackGameStateModel = model<IBlackjackGameStateDocument>(
    "BlackjackGameState",
    blackjackGameStateSchema
);

export default BlackjackGameStateModel;
