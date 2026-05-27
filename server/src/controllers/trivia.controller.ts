import { Response } from "express";
import { Types } from "mongoose";
import Tournament from "../models/tournament.model";
import TriviaGame from "../models/trivia-game.model";
import { AuthRequest } from "../middleware/auth.middleware";

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

const generateMockQuestions = (
  topic: string,
  questionCount: number
) => {
  return Array.from({ length: questionCount }).map((_, index) => ({
    question: `Sample question ${index + 1} about ${topic}?`,
    answers: [
      `Correct answer ${index + 1}`,
      `Wrong answer A ${index + 1}`,
      `Wrong answer B ${index + 1}`,
      `Wrong answer C ${index + 1}`
    ],
    correctAnswerIndex: 0,
    explanation: `This is a sample explanation for question ${index + 1}.`
  }));
};

const calculateScore = (
  isCorrect: boolean,
  responseTimeMs: number,
  timePerQuestion: number
): number => {
  if (!isCorrect) return 0;

  const maxTimeMs = timePerQuestion * 1000;
  const safeResponseTime = Math.min(Math.max(responseTimeMs, 0), maxTimeMs);

  const remainingRatio = Math.max(
    0,
    (maxTimeMs - safeResponseTime) / maxTimeMs
  );

  const baseScore = 500;
  const speedBonus = Math.round(500 * remainingRatio);

  return baseScore + speedBonus;
};

const buildPublicQuestions = (questions: any[], revealAnswers = false) => {
  return questions.map((question) => ({
    question: question.question,
    answers: question.answers,
    explanation: revealAnswers ? question.explanation : undefined,
    correctAnswerIndex: revealAnswers ? question.correctAnswerIndex : undefined
  }));
};

const buildRankedLeaderboard = (leaderboard: any[]) => {
  const sorted = [...leaderboard].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    if (b.correctAnswers !== a.correctAnswers) {
      return b.correctAnswers - a.correctAnswers;
    }

    return a.averageResponseTimeMs - b.averageResponseTimeMs;
  });

  return sorted.map((item, index) => ({
    rank: index + 1,
    ...item.toObject?.() ?? item
  }));
};

export const getTriviaTopicSuggestions = async (
  _req: AuthRequest,
  res: Response
) => {
  return res.status(200).json({
    topics: topicSuggestions
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
      topic,
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

    if (!title || !topic || !questionCount || !timePerQuestion || !maxParticipants) {
      return res.status(400).json({
        message:
          "title, topic, questionCount, timePerQuestion and maxParticipants are required"
      });
    }

    if (String(topic).trim().length < 2 || String(topic).trim().length > 120) {
      return res.status(400).json({
        message: "Topic must be between 2 and 120 characters"
      });
    }

    const safeQuestionCount = Number(questionCount);

    if (!Number.isInteger(safeQuestionCount) || safeQuestionCount < 1 || safeQuestionCount > 50) {
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

    if (isPrivate === true && (!privatePassword || String(privatePassword).trim() === "")) {
      return res.status(400).json({
        message: "Private trivia tournaments must include a privatePassword"
      });
    }

    const tournament = await Tournament.create({
      title,
      description,
      gameTitle: "Trivia",
      gameMode: "quiz",
      platform: "web",
      format: "league",
      entryFee: entryFee ?? 0,
      prizePool: 0,
      maxParticipants,
      startDate: new Date(),
      createdBy: req.userId,
      participants: [],
      status: "draft",
      isPrivate: isPrivate ?? false,
      privatePassword: isPrivate ? String(privatePassword) : "",
      inviteCode: `${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now()
        .toString(36)
        .slice(-4)
        .toUpperCase()}`
    });

    const questions = generateMockQuestions(String(topic).trim(), safeQuestionCount);

    const triviaGame = await TriviaGame.create({
      tournament: tournament._id,
      topic: String(topic).trim(),
      difficulty: difficulty || "medium",
      questionCount: safeQuestionCount,
      timePerQuestion: safeTimePerQuestion,
      status: "waiting",
      currentQuestionIndex: -1,
      questions,
      answers: [],
      leaderboard: []
    });

    return res.status(201).json({
      message: "Trivia tournament created successfully",
      tournament,
      triviaGame
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

    if (tournament.participants.length < 1) {
      return res.status(400).json({
        message: "At least one participant is required to start trivia"
      });
    }

    triviaGame.status = "in_progress";
    triviaGame.currentQuestionIndex = 0;
    triviaGame.startedAt = new Date();

    tournament.status = "ongoing";

    await triviaGame.save();
    await tournament.save();

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

    const scoreEarned = calculateScore(
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
      const previousAnswers = existingScore.correctAnswers + existingScore.wrongAnswers;
      const previousTotalResponseTime =
        existingScore.averageResponseTimeMs * previousAnswers;

      existingScore.totalScore += scoreEarned;

      if (isCorrect) {
        existingScore.correctAnswers += 1;
      } else {
        existingScore.wrongAnswers += 1;
      }

      const newAnswerCount = existingScore.correctAnswers + existingScore.wrongAnswers;
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

    return res.status(200).json({
      message: "Answer submitted successfully",
      isCorrect,
      scoreEarned,
      leaderboard: buildRankedLeaderboard(triviaGame.leaderboard)
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

    const isLastQuestion =
      triviaGame.currentQuestionIndex >= triviaGame.questions.length - 1;

    if (isLastQuestion) {
      triviaGame.status = "completed";
      triviaGame.completedAt = new Date();

      tournament.status = "completed";

      await triviaGame.save();
      await tournament.save();

      return res.status(200).json({
        message: "Trivia game completed",
        leaderboard: buildRankedLeaderboard(triviaGame.leaderboard)
      });
    }

    triviaGame.currentQuestionIndex += 1;
    await triviaGame.save();

    return res.status(200).json({
      message: "Moved to next question",
      currentQuestionIndex: triviaGame.currentQuestionIndex
    });
  } catch (error) {
    console.error("Next trivia question error:", error);
    return res.status(500).json({
      message: "Server error while moving to next question"
    });
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