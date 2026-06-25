import { Schema, model, Document, Types } from "mongoose";

export type TriviaDifficulty = "easy" | "medium" | "hard";

export type TriviaGameStatus =
  | "waiting"
  | "countdown"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ITriviaQuestion {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ITriviaAnswer {
  user: Types.ObjectId;
  questionIndex: number;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  scoreEarned: number;
  answeredAt: Date;
}

export interface ITriviaPlayerScore {
  user: Types.ObjectId;
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageResponseTimeMs: number;
}

export interface ITriviaGame extends Document {
  tournament: Types.ObjectId;
  topic: string;
  category: string;
  difficulty: TriviaDifficulty;
  questionCount: number;
  timePerQuestion: number;
  status: TriviaGameStatus;
  currentQuestionIndex: number;
  questions: ITriviaQuestion[];
  answers: ITriviaAnswer[];
  leaderboard: ITriviaPlayerScore[];
  startedAt?: Date;
  questionStartedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const triviaGameSchema = new Schema<ITriviaGame>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      unique: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: "General",
      trim: true
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: 50
    },
    timePerQuestion: {
      type: Number,
      required: true,
      min: 5,
      max: 120
    },
    status: {
      type: String,
      enum: ["waiting", "countdown", "in_progress", "completed", "cancelled"],
      default: "waiting"
    },
    currentQuestionIndex: {
      type: Number,
      default: -1
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
          trim: true
        },
        answers: {
          type: [String],
          required: true,
          validate: {
            validator: (answers: string[]) => answers.length === 4,
            message: "Each question must have exactly 4 answers"
          }
        },
        correctAnswerIndex: {
          type: Number,
          required: true,
          min: 0,
          max: 3
        },
        explanation: {
          type: String,
          default: ""
        }
      }
    ],
    answers: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        questionIndex: {
          type: Number,
          required: true
        },
        selectedAnswerIndex: {
          type: Number,
          required: true,
          min: 0,
          max: 3
        },
        isCorrect: {
          type: Boolean,
          required: true
        },
        responseTimeMs: {
          type: Number,
          required: true,
          min: 0
        },
        scoreEarned: {
          type: Number,
          required: true,
          min: 0
        },
        answeredAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    leaderboard: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        totalScore: {
          type: Number,
          default: 0
        },
        correctAnswers: {
          type: Number,
          default: 0
        },
        wrongAnswers: {
          type: Number,
          default: 0
        },
        averageResponseTimeMs: {
          type: Number,
          default: 0
        }
      }
    ],
    startedAt: {
      type: Date
    },
    questionStartedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

triviaGameSchema.index({ tournament: 1 });
triviaGameSchema.index({ status: 1 });
triviaGameSchema.index({ topic: 1 });
triviaGameSchema.index({ category: 1 });

const TriviaGame = model<ITriviaGame>("TriviaGame", triviaGameSchema);

export default TriviaGame;