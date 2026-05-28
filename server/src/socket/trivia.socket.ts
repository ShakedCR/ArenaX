import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import TriviaGame from "../models/trivia-game.model";
import Tournament from "../models/tournament.model";

type SafeAck = (payload: {
  ok: boolean;
  message?: string;
  data?: unknown;
}) => void;

interface TriviaJoinPayload {
  triviaGameId: string;
}

interface TriviaStartPayload {
  triviaGameId: string;
}

interface TriviaNextQuestionPayload {
  triviaGameId: string;
}

interface TriviaSubmitAnswerPayload {
  triviaGameId: string;
  questionIndex: number;
  selectedAnswerIndex: number;
  responseTimeMs: number;
}

const triviaRoomName = (triviaGameId: string): string =>
  `trivia:${triviaGameId}`;

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const buildRankedLeaderboard = (leaderboard: any[]) => {
  const sorted = [...leaderboard].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.averageResponseTimeMs - b.averageResponseTimeMs;
  });

  return sorted.map((item, index) => ({
    rank: index + 1,
    ...(item.toObject?.() ?? item)
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

const buildPublicQuestion = (question: any, questionIndex: number) => ({
  questionIndex,
  question: question.question,
  answers: question.answers
});

export const setupTriviaSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on("trivia:join", async (payload: TriviaJoinPayload, ack?: SafeAck) => {
      try {
        const { triviaGameId } = payload;

        if (!triviaGameId || !isValidObjectId(triviaGameId)) {
          ack?.({ ok: false, message: "Valid triviaGameId is required" });
          return;
        }

        const triviaGame = await TriviaGame.findById(triviaGameId);

        if (!triviaGame) {
          ack?.({ ok: false, message: "Trivia game not found" });
          return;
        }

        const tournament = await Tournament.findById(triviaGame.tournament);

        if (!tournament) {
          ack?.({ ok: false, message: "Tournament not found" });
          return;
        }

        const isParticipant = tournament.participants.some(
          (participantId) => participantId.toString() === userId
        );

        const isCreator = tournament.createdBy.toString() === userId;

        if (!isParticipant && !isCreator) {
          ack?.({
            ok: false,
            message: "Only tournament participants or creator can join trivia room"
          });
          return;
        }

        const room = triviaRoomName(triviaGameId);
        socket.join(room);

        io.to(room).emit("trivia:player-joined", {
          triviaGameId,
          userId,
          at: new Date().toISOString()
        });

        ack?.({
          ok: true,
          data: {
            triviaGameId,
            status: triviaGame.status,
            currentQuestionIndex: triviaGame.currentQuestionIndex
          }
        });
      } catch (error) {
        console.error("trivia:join error:", error);
        ack?.({ ok: false, message: "Server error while joining trivia room" });
      }
    });

    socket.on("trivia:leave", (payload: TriviaJoinPayload, ack?: SafeAck) => {
      const { triviaGameId } = payload;

      if (!triviaGameId) {
        ack?.({ ok: false, message: "triviaGameId is required" });
        return;
      }

      socket.leave(triviaRoomName(triviaGameId));

      ack?.({ ok: true });
    });

    socket.on("trivia:start", async (payload: TriviaStartPayload, ack?: SafeAck) => {
      try {
        const { triviaGameId } = payload;

        if (!triviaGameId || !isValidObjectId(triviaGameId)) {
          ack?.({ ok: false, message: "Valid triviaGameId is required" });
          return;
        }

        const triviaGame = await TriviaGame.findById(triviaGameId);

        if (!triviaGame) {
          ack?.({ ok: false, message: "Trivia game not found" });
          return;
        }

        const tournament = await Tournament.findById(triviaGame.tournament);

        if (!tournament) {
          ack?.({ ok: false, message: "Tournament not found" });
          return;
        }

        if (tournament.createdBy.toString() !== userId) {
          ack?.({ ok: false, message: "Only creator can start trivia game" });
          return;
        }

        if (triviaGame.status !== "waiting") {
          ack?.({ ok: false, message: "Trivia game already started or completed" });
          return;
        }

        triviaGame.status = "in_progress";
        triviaGame.currentQuestionIndex = 0;
        triviaGame.startedAt = new Date();

        tournament.status = "ongoing";

        await triviaGame.save();
        await tournament.save();

        const currentQuestion = triviaGame.questions[0];

        io.to(triviaRoomName(triviaGameId)).emit("trivia:question-started", {
          triviaGameId,
          currentQuestionIndex: 0,
          timePerQuestion: triviaGame.timePerQuestion,
          question: buildPublicQuestion(currentQuestion, 0),
          at: new Date().toISOString()
        });

        ack?.({ ok: true });
      } catch (error) {
        console.error("trivia:start error:", error);
        ack?.({ ok: false, message: "Server error while starting trivia game" });
      }
    });

    socket.on(
      "trivia:submit-answer",
      async (payload: TriviaSubmitAnswerPayload, ack?: SafeAck) => {
        try {
          const {
            triviaGameId,
            questionIndex,
            selectedAnswerIndex,
            responseTimeMs
          } = payload;

          if (!triviaGameId || !isValidObjectId(triviaGameId)) {
            ack?.({ ok: false, message: "Valid triviaGameId is required" });
            return;
          }

          const triviaGame = await TriviaGame.findById(triviaGameId);

          if (!triviaGame) {
            ack?.({ ok: false, message: "Trivia game not found" });
            return;
          }

          if (triviaGame.status !== "in_progress") {
            ack?.({ ok: false, message: "Trivia game is not in progress" });
            return;
          }

          const tournament = await Tournament.findById(triviaGame.tournament);

          if (!tournament) {
            ack?.({ ok: false, message: "Tournament not found" });
            return;
          }

          const userObjectId = new Types.ObjectId(userId);

          const isParticipant = tournament.participants.some((participantId) =>
            participantId.equals(userObjectId)
          );

          if (!isParticipant) {
            ack?.({
              ok: false,
              message: "Only tournament participants can answer"
            });
            return;
          }

          if (questionIndex !== triviaGame.currentQuestionIndex) {
            ack?.({ ok: false, message: "Invalid question index" });
            return;
          }

          const alreadyAnswered = triviaGame.answers.some(
            (answer) =>
              answer.user.toString() === userId &&
              answer.questionIndex === questionIndex
          );

          if (alreadyAnswered) {
            ack?.({ ok: false, message: "User already answered this question" });
            return;
          }

          const currentQuestion = triviaGame.questions[questionIndex];

          if (!currentQuestion) {
            ack?.({ ok: false, message: "Question not found" });
            return;
          }

          if (
            selectedAnswerIndex === undefined ||
            selectedAnswerIndex < 0 ||
            selectedAnswerIndex > 3
          ) {
            ack?.({
              ok: false,
              message: "selectedAnswerIndex must be between 0 and 3"
            });
            return;
          }

          const safeResponseTimeMs = Math.min(
            Math.max(Number(responseTimeMs) || 0, 0),
            triviaGame.timePerQuestion * 1000
          );

          const isCorrect =
            selectedAnswerIndex === currentQuestion.correctAnswerIndex;

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

          socket.emit("trivia:answer-result", {
            triviaGameId,
            questionIndex,
            isCorrect,
            scoreEarned,
            selectedAnswerIndex,
            correctAnswerIndex: currentQuestion.correctAnswerIndex,
            correctAnswer: currentQuestion.answers[currentQuestion.correctAnswerIndex],
            explanation: currentQuestion.explanation,
            at: new Date().toISOString()
          });

          io.to(triviaRoomName(triviaGameId)).emit("trivia:leaderboard-updated", {
            triviaGameId,
            leaderboard,
            at: new Date().toISOString()
          });

          ack?.({
            ok: true,
            data: {
              isCorrect,
              scoreEarned
            }
          });
        } catch (error) {
          console.error("trivia:submit-answer error:", error);
          ack?.({ ok: false, message: "Server error while submitting answer" });
        }
      }
    );

    socket.on(
      "trivia:next-question",
      async (payload: TriviaNextQuestionPayload, ack?: SafeAck) => {
        try {
          const { triviaGameId } = payload;

          if (!triviaGameId || !isValidObjectId(triviaGameId)) {
            ack?.({ ok: false, message: "Valid triviaGameId is required" });
            return;
          }

          const triviaGame = await TriviaGame.findById(triviaGameId);

          if (!triviaGame) {
            ack?.({ ok: false, message: "Trivia game not found" });
            return;
          }

          const tournament = await Tournament.findById(triviaGame.tournament);

          if (!tournament) {
            ack?.({ ok: false, message: "Tournament not found" });
            return;
          }

          if (tournament.createdBy.toString() !== userId) {
            ack?.({ ok: false, message: "Only creator can move to next question" });
            return;
          }

          if (triviaGame.status !== "in_progress") {
            ack?.({ ok: false, message: "Trivia game is not in progress" });
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

            io.to(triviaRoomName(triviaGameId)).emit("trivia:game-completed", {
              triviaGameId,
              leaderboard: buildRankedLeaderboard(triviaGame.leaderboard),
              at: new Date().toISOString()
            });

            ack?.({ ok: true });
            return;
          }

          triviaGame.currentQuestionIndex += 1;
          await triviaGame.save();

          const nextQuestion =
            triviaGame.questions[triviaGame.currentQuestionIndex];

          io.to(triviaRoomName(triviaGameId)).emit("trivia:question-started", {
            triviaGameId,
            currentQuestionIndex: triviaGame.currentQuestionIndex,
            timePerQuestion: triviaGame.timePerQuestion,
            question: buildPublicQuestion(
              nextQuestion,
              triviaGame.currentQuestionIndex
            ),
            at: new Date().toISOString()
          });

          ack?.({ ok: true });
        } catch (error) {
          console.error("trivia:next-question error:", error);
          ack?.({
            ok: false,
            message: "Server error while moving to next question"
          });
        }
      }
    );
  });
};