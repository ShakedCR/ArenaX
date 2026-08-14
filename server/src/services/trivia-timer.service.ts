import { Server } from "socket.io";
import TriviaGame from "../models/trivia-game.model";
import Tournament from "../models/tournament.model";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import { buildRankedLeaderboard } from "../utils/trivia.utils";
import { updateEloFromLeaderboard } from "./elo.service";

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
  const questionStartedAt = new Date();

  triviaGame.questionStartedAt = questionStartedAt;
  await triviaGame.save();

  io.to(room).emit("trivia:question-started", {
    triviaGameId,
    currentQuestionIndex: triviaGame.currentQuestionIndex,
    timePerQuestion: triviaGame.timePerQuestion,
    question: buildPublicQuestion(
      currentQuestion,
      triviaGame.currentQuestionIndex
    ),
    serverStartedAt: questionStartedAt.toISOString()
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
  const tournamentId = triviaGame.tournament.toString();

  io.to(triviaRoomName(triviaGameId)).emit("trivia:question-ended", {
    triviaGameId,
    questionIndex: triviaGame.currentQuestionIndex,
    correctAnswerIndex: currentQuestion.correctAnswerIndex,
    correctAnswer: currentQuestion.answers[currentQuestion.correctAnswerIndex],
    explanation: currentQuestion.explanation,
    leaderboard,
    at: new Date().toISOString()
  });

  // Notify the tournament room so the standings page refreshes live
  io.to(`tournament:${tournamentId}`).emit("tournament:update", {
    tournamentId,
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

export const recoverInProgressTriviaGames = async (io: Server): Promise<void> => {
  const stuckGames = await TriviaGame.find({ status: "in_progress" });

  if (stuckGames.length === 0) return;

  console.log(`[trivia] Recovering ${stuckGames.length} in-progress game(s) after restart`);

  for (const game of stuckGames) {
    const id = (game._id as any).toString();
    if (!timers.has(id)) {
      await startTriviaQuestionTimer(io, id);
    }
  }
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

  const expectedIndex = triviaGame.currentQuestionIndex;
  const isLastQuestion = expectedIndex >= triviaGame.questions.length - 1;

  if (isLastQuestion) {
    const completed = await TriviaGame.findOneAndUpdate(
      { _id: triviaGameId, currentQuestionIndex: expectedIndex, status: "in_progress" },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true }
    );

    if (!completed) return;

    clearTriviaTimers(triviaGameId);

    // ── Prize distribution + result ───────────────────────────────────────────
    const prizePool: number = (tournament as any).prizePool || 0;
    const leaderboard = buildRankedLeaderboard(triviaGame.leaderboard);

    const topScore = leaderboard[0]?.totalScore ?? 0;
    const winners = topScore > 0 ? leaderboard.filter(e => e.totalScore === topScore) : [];
    const isTie = winners.length > 1;
    const splitPrize = prizePool > 0 && winners.length > 0 ? Math.floor(prizePool / winners.length) : 0;
    const singleWinnerId = !isTie && winners[0]
      ? (winners[0].user?._id?.toString() ?? winners[0].user?.toString())
      : null;

    // Save winner to tournament.result so profile win rate works
    await Tournament.findByIdAndUpdate(tournament._id, {
      status: "completed",
      "result.isTie": isTie,
      ...(singleWinnerId ? { "result.winner": singleWinnerId } : {}),
    });

    for (const winner of winners) {
      if (splitPrize <= 0) break;
      const winnerId = winner.user?._id?.toString() ?? winner.user?.toString();
      if (!winnerId) continue;

      const updatedUser = await User.findByIdAndUpdate(
        winnerId,
        { $inc: { walletBalance: splitPrize } },
        { new: true }
      ).select("walletBalance");

      await Transaction.create({
        user: winnerId,
        tournament: tournament._id,
        amount: splitPrize,
        type: "prize",
        status: "completed",
        description: isTie ? "Trivia tournament prize (tie split)" : "Trivia tournament prize",
      });

      if (updatedUser) {
        io.to(`user:${winnerId}`).emit("wallet:updated", {
          walletBalance: updatedUser.walletBalance,
        });
      }
    }

    // Update Trivia Elo — fire-and-forget, same pattern as Blackjack finalizeMatch()
    updateEloFromLeaderboard(
      io,
      leaderboard.map(e => ({ playerId: (e.user as any).toString(), rank: e.rank })),
      "trivia"
    ).catch(err => {
      console.error("[elo] Failed to update Trivia Elo:", err);
    });

    io.emit("tournament:status-changed", { tournamentId: tournament._id.toString(), status: "completed" });

    io.to(triviaRoomName(triviaGameId)).emit("trivia:game-completed", {
      triviaGameId,
      leaderboard,
      at: new Date().toISOString()
    });

    return;
  }

  const advanced = await TriviaGame.findOneAndUpdate(
    { _id: triviaGameId, currentQuestionIndex: expectedIndex, status: "in_progress" },
    { $inc: { currentQuestionIndex: 1 } },
    { new: true }
  );

  if (!advanced) return;

  await startTriviaQuestionTimer(io, triviaGameId);
};