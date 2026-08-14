import { Response } from "express";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import Tournament from "../models/tournament.model";
import TriviaGame from "../models/trivia-game.model";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateTriviaQuestionsWithAI } from "../services/ai-trivia-question.service";
import {
  prepareDocumentChunks,
  saveDocumentChunks,
  getContextFromChunks,
} from "../services/rag.service";
import { getIO } from "../socket";
import {
  clearTriviaTimers,
  endCurrentTriviaQuestion,
  startTriviaQuestionTimer
} from "../services/trivia-timer.service";
import { calculateTriviaScore, buildRankedLeaderboard } from "../utils/trivia.utils";

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const topicSuggestions = [
  "Cyber Security",
  "Football",
  "Movies",
  "Gaming",
  "History",
  "Science",
  "Geography",
  "Technology",
  "Music",
  "General Knowledge"
];

const categorySuggestions = [
  "General",
  "Cyber Security",
  "Network Security",
  "Web Security",
  "Movies",
  "Gaming",
  "Sports",
  "Football",
  "History",
  "Science",
  "Technology",
  "Music",
  "Custom"
];

const generateInviteCode = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();

  return `${randomPart}${timePart}`;
};

const buildPublicQuestions = (questions: any[], revealAnswers = false) => {
  return questions.map((question) => ({
    question: question.question,
    answers: question.answers,
    explanation: revealAnswers ? question.explanation : undefined,
    correctAnswerIndex: revealAnswers ? question.correctAnswerIndex : undefined
  }));
};

export const getTriviaTopicSuggestions = async (
  _req: AuthRequest,
  res: Response
) => {
  return res.status(200).json({
    topics: topicSuggestions,
    categories: categorySuggestions
  });
};

export const createTriviaTournament = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const {
      title,
      description,
      category,
      difficulty,
      questionCount,
      timePerQuestion,
      maxParticipants,
      entryFee,
      isPrivate,
      privatePassword
    } = req.body;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // FormData sends booleans as strings — normalize before any checks
    const safeIsPrivate = isPrivate === true || isPrivate === "true";

    if (!title || !questionCount || !timePerQuestion || !maxParticipants) {
      return res.status(400).json({
        message:
          "title, questionCount, timePerQuestion and maxParticipants are required"
      });
    }

    const safeCategory = category ? String(category).trim() : "General";
    const safeTopic = safeCategory;

    if (safeCategory.length < 2 || safeCategory.length > 80) {
      return res.status(400).json({
        message: "Category must be between 2 and 80 characters"
      });
    }

    const safeQuestionCount = Number(questionCount);

    if (
      !Number.isInteger(safeQuestionCount) ||
      safeQuestionCount < 1 ||
      safeQuestionCount > 50
    ) {
      return res.status(400).json({
        message: "questionCount must be between 1 and 50"
      });
    }

    const safeTimePerQuestion = Number(timePerQuestion);

    if (
      !Number.isInteger(safeTimePerQuestion) ||
      safeTimePerQuestion < 5 ||
      safeTimePerQuestion > 120
    ) {
      return res.status(400).json({
        message: "timePerQuestion must be between 5 and 120 seconds"
      });
    }

    const safeMaxParticipants = Number(maxParticipants);

    if (!Number.isInteger(safeMaxParticipants) || safeMaxParticipants < 2 || safeMaxParticipants > 10) {
      return res.status(400).json({
        message: "maxParticipants must be between 2 and 10 for trivia"
      });
    }

    if (
      safeIsPrivate &&
      (!privatePassword || String(privatePassword).trim() === "")
    ) {
      return res.status(400).json({
        message: "Private trivia tournaments must include a privatePassword"
      });
    }

    const safeDifficulty = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    // RAG: if a document was uploaded, prepare chunks and extract context
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    let preparedChunks: Awaited<ReturnType<typeof prepareDocumentChunks>> | null = null;
    let ragContext: string[] | undefined;

    if (uploadedFile) {
      preparedChunks = await prepareDocumentChunks(uploadedFile.buffer, uploadedFile.mimetype);
      ragContext = await getContextFromChunks(safeCategory, preparedChunks);
    }

    const questions = await generateTriviaQuestionsWithAI({
      topic: safeTopic,
      category: safeCategory,
      difficulty: safeDifficulty,
      questionCount: safeQuestionCount,
      context: ragContext,
    });

    const safeEntryFee = Number(entryFee) || 0;

    if (safeEntryFee > 0) {
      const creator = await User.findById(req.userId).select("walletBalance");
      if (!creator || creator.walletBalance < safeEntryFee) {
        return res.status(400).json({ message: "Insufficient wallet balance to create this tournament" });
      }
    }

    const tournament = await Tournament.create({
      title,
      description,
      gameTitle: "Trivia",
      gameMode: "quiz",
      platform: "web",
      format: "league",
      entryFee: safeEntryFee,
      prizePool: safeEntryFee,
      maxParticipants: safeMaxParticipants,
      startDate: new Date(),
      createdBy: req.userId,
      participants: [new Types.ObjectId(req.userId)],
      status: "open",
      isPrivate: safeIsPrivate,
      privatePassword: safeIsPrivate ? await bcrypt.hash(String(privatePassword), 10) : "",
      inviteCode: generateInviteCode()
    });

    if (safeEntryFee > 0) {
      await User.findByIdAndUpdate(req.userId, { $inc: { walletBalance: -safeEntryFee } });
      await Transaction.create({
        user: req.userId,
        tournament: tournament._id,
        amount: safeEntryFee,
        type: "entry_fee",
        status: "completed",
        description: `Entry fee for tournament: ${title}`
      });
      const updatedUser = await User.findById(req.userId).select("walletBalance").lean() as { walletBalance: number } | null;
      getIO().to(`user:${req.userId}`).emit("wallet:updated", { walletBalance: updatedUser?.walletBalance ?? 0 });
    }

    const triviaGame = await TriviaGame.create({
      tournament: tournament._id,
      topic: safeTopic,
      category: safeCategory,
      difficulty: safeDifficulty,
      questionCount: safeQuestionCount,
      timePerQuestion: safeTimePerQuestion,
      status: "waiting",
      currentQuestionIndex: -1,
      hasDocument: !!uploadedFile,
      questions,
      answers: [],
      leaderboard: []
    });

    // Phase 2: save document chunks to DB now that we have a tournamentId
    if (preparedChunks && uploadedFile) {
      await saveDocumentChunks(
        preparedChunks,
        uploadedFile.originalname,
        tournament._id.toString()
      );
    }

    getIO().emit("tournament:created", { tournament });

    return res.status(201).json({
      message: "Trivia tournament created successfully",
      tournament,
      triviaGame,
      hasDocument: !!uploadedFile,
    });
  } catch (error) {
    console.error("Create trivia tournament error:", error);

    return res.status(500).json({
      message: "Server error while creating trivia tournament"
    });
  }
};

export const getTriviaGameByTournament = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const tournamentId = req.params.tournamentId as string;

    if (!isValidObjectId(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const triviaGame = await TriviaGame.findOne({
      tournament: tournamentId
    }).populate("tournament");

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    const revealAnswers = triviaGame.status === "completed";

    return res.status(200).json({
      triviaGame: {
        ...triviaGame.toObject(),
        questions: buildPublicQuestions(triviaGame.questions, revealAnswers)
      }
    });
  } catch (error) {
    console.error("Get trivia game error:", error);

    return res.status(500).json({
      message: "Server error while fetching trivia game"
    });
  }
};

export const startTriviaGame = async (req: AuthRequest, res: Response) => {
  try {
    const triviaGameId = req.params.triviaGameId as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(triviaGameId)) {
      return res.status(400).json({ message: "Invalid trivia game ID" });
    }

    const triviaGame = await TriviaGame.findById(triviaGameId);

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    const tournament = await Tournament.findById(triviaGame.tournament);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Only tournament creator can start the trivia game"
      });
    }

    if (triviaGame.status !== "waiting") {
      return res.status(400).json({
        message: "Trivia game already started or completed"
      });
    }

    if (tournament.participants.length < 2) {
      return res.status(400).json({
        message: "At least 2 participants are required to start trivia"
      });
    }

    triviaGame.status = "in_progress";
    triviaGame.currentQuestionIndex = 0;
    triviaGame.startedAt = new Date();

    tournament.status = "ongoing";

    await triviaGame.save();
    await tournament.save();

    getIO().emit("tournament:status-changed", { tournamentId: tournament._id.toString(), status: "ongoing" });

    await startTriviaQuestionTimer(getIO(), triviaGameId);

    return res.status(200).json({
      message: "Trivia game started successfully",
      triviaGame
    });
  } catch (error) {
    console.error("Start trivia game error:", error);

    return res.status(500).json({
      message: "Server error while starting trivia game"
    });
  }
};

export const submitTriviaAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const triviaGameId = req.params.triviaGameId as string;
    const { questionIndex, selectedAnswerIndex, responseTimeMs } = req.body;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(triviaGameId)) {
      return res.status(400).json({ message: "Invalid trivia game ID" });
    }

    const triviaGame = await TriviaGame.findById(triviaGameId);

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    if (triviaGame.status !== "in_progress") {
      return res.status(400).json({
        message: "Trivia game is not in progress"
      });
    }

    const tournament = await Tournament.findById(triviaGame.tournament);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const userObjectId = new Types.ObjectId(req.userId);

    const isParticipant = tournament.participants.some((participantId) =>
      participantId.equals(userObjectId)
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Only tournament participants can answer trivia questions"
      });
    }

    if (questionIndex !== triviaGame.currentQuestionIndex) {
      return res.status(400).json({
        message: "Invalid question index"
      });
    }

    const alreadyAnswered = triviaGame.answers.some(
      (answer) =>
        answer.user.toString() === req.userId &&
        answer.questionIndex === questionIndex
    );

    if (alreadyAnswered) {
      return res.status(400).json({
        message: "User already answered this question"
      });
    }

    const currentQuestion = triviaGame.questions[questionIndex];

    if (!currentQuestion) {
      return res.status(404).json({
        message: "Question not found"
      });
    }

    if (
      selectedAnswerIndex === undefined ||
      selectedAnswerIndex < 0 ||
      selectedAnswerIndex > 3
    ) {
      return res.status(400).json({
        message: "selectedAnswerIndex must be between 0 and 3"
      });
    }

    const safeResponseTimeMs = Math.min(
      Math.max(Number(responseTimeMs) || 0, 0),
      triviaGame.timePerQuestion * 1000
    );

    const isCorrect = selectedAnswerIndex === currentQuestion.correctAnswerIndex;

    const scoreEarned = calculateTriviaScore(
      isCorrect,
      safeResponseTimeMs,
      triviaGame.timePerQuestion
    );

    triviaGame.answers.push({
      user: userObjectId,
      questionIndex,
      selectedAnswerIndex,
      isCorrect,
      responseTimeMs: safeResponseTimeMs,
      scoreEarned,
      answeredAt: new Date()
    });

    const existingScore = triviaGame.leaderboard.find((score) =>
      score.user.equals(userObjectId)
    );

    if (existingScore) {
      const previousAnswers =
        existingScore.correctAnswers + existingScore.wrongAnswers;

      const previousTotalResponseTime =
        existingScore.averageResponseTimeMs * previousAnswers;

      existingScore.totalScore += scoreEarned;

      if (isCorrect) existingScore.correctAnswers += 1;
      else existingScore.wrongAnswers += 1;

      const newAnswerCount =
        existingScore.correctAnswers + existingScore.wrongAnswers;

      existingScore.averageResponseTimeMs = Math.round(
        (previousTotalResponseTime + safeResponseTimeMs) / newAnswerCount
      );
    } else {
      triviaGame.leaderboard.push({
        user: userObjectId,
        totalScore: scoreEarned,
        correctAnswers: isCorrect ? 1 : 0,
        wrongAnswers: isCorrect ? 0 : 1,
        averageResponseTimeMs: safeResponseTimeMs
      });
    }

    await triviaGame.save();

    const leaderboard = buildRankedLeaderboard(triviaGame.leaderboard);

    return res.status(200).json({
      message: "Answer submitted successfully",
      isCorrect,
      scoreEarned,
      selectedAnswerIndex,
      correctAnswerIndex: currentQuestion.correctAnswerIndex,
      correctAnswer: currentQuestion.answers[currentQuestion.correctAnswerIndex],
      explanation: currentQuestion.explanation,
      leaderboard
    });
  } catch (error) {
    console.error("Submit trivia answer error:", error);

    return res.status(500).json({
      message: "Server error while submitting trivia answer"
    });
  }
};

export const nextTriviaQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const triviaGameId = req.params.triviaGameId as string;

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(triviaGameId)) {
      return res.status(400).json({ message: "Invalid trivia game ID" });
    }

    const triviaGame = await TriviaGame.findById(triviaGameId);

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    const tournament = await Tournament.findById(triviaGame.tournament);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "Only tournament creator can move to next question"
      });
    }

    if (triviaGame.status !== "in_progress") {
      return res.status(400).json({
        message: "Trivia game is not in progress"
      });
    }

    clearTriviaTimers(triviaGameId);
    await endCurrentTriviaQuestion(getIO(), triviaGameId);

    return res.status(200).json({
      message: "Current question ended manually"
    });
  } catch (error) {
    console.error("Next trivia question error:", error);

    return res.status(500).json({
      message: "Server error while moving to next question"
    });
  }
};

export const getTriviaStandings = async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId as string;
    if (!isValidObjectId(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(tournamentId).populate(
      "participants",
      "fullName username avatarUrl"
    );

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const triviaGame = await TriviaGame.findOne({ tournament: tournamentId });

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    const leaderboard = buildRankedLeaderboard(triviaGame.leaderboard);
    const topScore = leaderboard[0]?.totalScore ?? 0;

    const players = (tournament.participants as any[]).map((p: any) => {
      const pid = p._id.toString();
      const entry = leaderboard.find(
        (e) => (e.user?._id ?? e.user)?.toString() === pid
      );

      let status: "active" | "winner" | "completed";
      if (tournament.status === "completed") {
        status =
          entry && entry.totalScore === topScore && topScore > 0
            ? "winner"
            : "completed";
      } else {
        status = "active";
      }

      return {
        _id: pid,
        username: p.username,
        fullName: p.fullName,
        avatarUrl: p.avatarUrl,
        totalScore: entry?.totalScore ?? 0,
        correctAnswers: entry?.correctAnswers ?? 0,
        wrongAnswers: entry?.wrongAnswers ?? 0,
        rank: entry?.rank ?? null,
        status,
      };
    });

    return res.status(200).json({
      tournament: {
        _id: tournament._id,
        title: tournament.title,
        gameTitle: tournament.gameTitle,
        status: tournament.status,
        prizePool: tournament.prizePool,
        startDate: tournament.startDate,
        maxParticipants: tournament.maxParticipants,
        category: triviaGame.category,
        difficulty: triviaGame.difficulty,
        questionCount: triviaGame.questionCount,
        currentQuestionIndex: triviaGame.currentQuestionIndex,
      },
      players,
      stages: [],
    });
  } catch (error) {
    console.error("Get trivia standings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTriviaLeaderboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const triviaGameId = req.params.triviaGameId as string;

    if (!isValidObjectId(triviaGameId)) {
      return res.status(400).json({ message: "Invalid trivia game ID" });
    }

    const triviaGame = await TriviaGame.findById(triviaGameId).populate(
      "leaderboard.user",
      "fullName username avatarUrl email"
    );

    if (!triviaGame) {
      return res.status(404).json({ message: "Trivia game not found" });
    }

    return res.status(200).json({
      leaderboard: buildRankedLeaderboard(triviaGame.leaderboard)
    });
  } catch (error) {
    console.error("Get trivia leaderboard error:", error);

    return res.status(500).json({
      message: "Server error while fetching trivia leaderboard"
    });
  }
};