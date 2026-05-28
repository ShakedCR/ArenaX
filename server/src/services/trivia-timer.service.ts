import { Server } from "socket.io";
import TriviaGame from "../models/trivia-game.model";
import Tournament from "../models/tournament.model";

type TriviaTimerState = {
  questionTimer?: NodeJS.Timeout;
  nextQuestionTimer?: NodeJS.Timeout;
};

const timers = new Map<string, TriviaTimerState>();

const triviaRoomName = (triviaGameId: string): string => `trivia:${triviaGameId}`;

const buildPublicQuestion = (question: any, questionIndex: number) => ({
  questionIndex,
  question: question.question,
  answers: question.answers
});

const buildRankedLeaderboard = (leaderboard: any[]) => {
  const sorted = [...leaderboard].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) {
      return b.correctAnswers - a.correctAnswers;
    }

    return a.averageResponseTimeMs - b.averageResponseTimeMs;
  });

  return sorted.map((item, index) => ({
    rank: index + 1,
    ...(item.toObject?.() ?? item)
  }));
};

export const clearTriviaTimers = (triviaGameId: string): void => {
  const state = timers.get(triviaGameId);

  if (!state) return;

  if (state.questionTimer) {
    clearTimeout(state.questionTimer);
  }

  if (state.nextQuestionTimer) {
    clearTimeout(state.nextQuestionTimer);
  }

  timers.delete(triviaGameId);
};

export const startTriviaQuestionTimer = async (
  io: Server,
  triviaGameId: string
): Promise<void> => {
  clearTriviaTimers(triviaGameId);

  const triviaGame = await TriviaGame.findById(triviaGameId);

  if (!triviaGame || triviaGame.status !== "in_progress") {
    return;
  }

  const currentQuestion =
    triviaGame.questions[triviaGame.currentQuestionIndex];

  if (!currentQuestion) {
    return;
  }

  const room = triviaRoomName(triviaGameId);

  io.to(room).emit("trivia:question-started", {
    triviaGameId,
    currentQuestionIndex: triviaGame.currentQuestionIndex,
    timePerQuestion: triviaGame.timePerQuestion,
    question: buildPublicQuestion(
      currentQuestion,
      triviaGame.currentQuestionIndex
    ),
    serverStartedAt: new Date().toISOString()
  });

  const questionTimer = setTimeout(async () => {
    await endCurrentTriviaQuestion(io, triviaGameId);
  }, triviaGame.timePerQuestion * 1000);

  timers.set(triviaGameId, {
    questionTimer
  });
};

export const endCurrentTriviaQuestion = async (
  io: Server,
  triviaGameId: string
): Promise<void> => {
  const triviaGame = await TriviaGame.findById(triviaGameId);

  if (!triviaGame || triviaGame.status !== "in_progress") {
    clearTriviaTimers(triviaGameId);
    return;
  }

  const currentQuestion =
    triviaGame.questions[triviaGame.currentQuestionIndex];

  if (!currentQuestion) {
    clearTriviaTimers(triviaGameId);
    return;
  }

  const leaderboard = buildRankedLeaderboard(triviaGame.leaderboard);

  io.to(triviaRoomName(triviaGameId)).emit("trivia:question-ended", {
    triviaGameId,
    questionIndex: triviaGame.currentQuestionIndex,
    correctAnswerIndex: currentQuestion.correctAnswerIndex,
    correctAnswer: currentQuestion.answers[currentQuestion.correctAnswerIndex],
    explanation: currentQuestion.explanation,
    leaderboard,
    at: new Date().toISOString()
  });

  const nextQuestionTimer = setTimeout(async () => {
    await moveToNextTriviaQuestion(io, triviaGameId);
  }, 5000);

  timers.set(triviaGameId, {
    nextQuestionTimer
  });
};

export const moveToNextTriviaQuestion = async (
  io: Server,
  triviaGameId: string
): Promise<void> => {
  const triviaGame = await TriviaGame.findById(triviaGameId);

  if (!triviaGame || triviaGame.status !== "in_progress") {
    clearTriviaTimers(triviaGameId);
    return;
  }

  const tournament = await Tournament.findById(triviaGame.tournament);

  if (!tournament) {
    clearTriviaTimers(triviaGameId);
    return;
  }

  const isLastQuestion =
    triviaGame.currentQuestionIndex >= triviaGame.questions.length - 1;

  if (isLastQuestion) {
    triviaGame.status = "completed";
    triviaGame.completedAt = new Date();

    tournament.status = "completed";

    await triviaGame.save();
    await tournament.save();

    clearTriviaTimers(triviaGameId);

    io.to(triviaRoomName(triviaGameId)).emit("trivia:game-completed", {
      triviaGameId,
      leaderboard: buildRankedLeaderboard(triviaGame.leaderboard),
      at: new Date().toISOString()
    });

    return;
  }

  triviaGame.currentQuestionIndex += 1;
  await triviaGame.save();

  await startTriviaQuestionTimer(io, triviaGameId);
};