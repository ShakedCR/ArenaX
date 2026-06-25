import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import TriviaGame from "../models/trivia-game.model";
import Tournament from "../models/tournament.model";
import {
  clearTriviaTimers,
  endCurrentTriviaQuestion,
  startTriviaQuestionTimer
} from "../services/trivia-timer.service";
import { calculateTriviaScore } from "../utils/trivia.utils";

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

        // If the game is already running, restore the current question for this socket
        if (triviaGame.status === "in_progress" && triviaGame.currentQuestionIndex >= 0) {
          const currentQuestion = triviaGame.questions[triviaGame.currentQuestionIndex];

          if (currentQuestion && triviaGame.questionStartedAt) {
            socket.emit("trivia:question-started", {
              triviaGameId,
              currentQuestionIndex: triviaGame.currentQuestionIndex,
              timePerQuestion: triviaGame.timePerQuestion,
              question: {
                questionIndex: triviaGame.currentQuestionIndex,
                question: currentQuestion.question,
                answers: currentQuestion.answers,
              },
              serverStartedAt: triviaGame.questionStartedAt.toISOString(),
            });
          }
        }

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
          ack?.({
            ok: false,
            message: "Trivia game already started or completed"
          });
          return;
        }

        triviaGame.status = "in_progress";
        triviaGame.currentQuestionIndex = 0;
        triviaGame.startedAt = new Date();

        tournament.status = "ongoing";

        await triviaGame.save();
        await tournament.save();

        io.emit("tournament:status-changed", { tournamentId: tournament._id.toString(), status: "ongoing" });

        await startTriviaQuestionTimer(io, triviaGameId);

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
          const { triviaGameId, questionIndex, selectedAnswerIndex, responseTimeMs } = payload;

          if (!triviaGameId || !isValidObjectId(triviaGameId)) {
            ack?.({ ok: false, message: "Valid triviaGameId is required" });
            return;
          }
          if (selectedAnswerIndex === undefined || selectedAnswerIndex < 0 || selectedAnswerIndex > 3) {
            ack?.({ ok: false, message: "selectedAnswerIndex must be between 0 and 3" });
            return;
          }

          // Read game once for validation + score calculation
          const triviaGame = await TriviaGame.findById(triviaGameId);
          if (!triviaGame) { ack?.({ ok: false, message: "Trivia game not found" }); return; }
          if (triviaGame.status !== "in_progress") { ack?.({ ok: false, message: "Trivia game is not in progress" }); return; }
          if (questionIndex !== triviaGame.currentQuestionIndex) { ack?.({ ok: false, message: "Invalid question index" }); return; }

          const tournament = await Tournament.findById(triviaGame.tournament);
          if (!tournament) { ack?.({ ok: false, message: "Tournament not found" }); return; }

          const userObjectId = new Types.ObjectId(userId);
          const isParticipant = tournament.participants.some((p) => p.equals(userObjectId));
          if (!isParticipant) { ack?.({ ok: false, message: "Only tournament participants can answer" }); return; }

          const currentQuestion = triviaGame.questions[questionIndex];
          if (!currentQuestion) { ack?.({ ok: false, message: "Question not found" }); return; }

          const safeResponseTimeMs = Math.min(Math.max(Number(responseTimeMs) || 0, 0), triviaGame.timePerQuestion * 1000);
          const isCorrect = selectedAnswerIndex === currentQuestion.correctAnswerIndex;
          const scoreEarned = calculateTriviaScore(isCorrect, safeResponseTimeMs, triviaGame.timePerQuestion);

          const answerDoc = {
            user: userObjectId,
            questionIndex,
            selectedAnswerIndex,
            isCorrect,
            responseTimeMs: safeResponseTimeMs,
            scoreEarned,
            answeredAt: new Date()
          };

          // Atomic push — the filter rejects if user already answered this question
          const pushResult = await TriviaGame.updateOne(
            {
              _id: triviaGameId,
              status: "in_progress",
              currentQuestionIndex: questionIndex,
              "answers": {
                $not: { $elemMatch: { user: userObjectId, questionIndex } }
              }
            },
            { $push: { answers: answerDoc } }
          );

          if (pushResult.modifiedCount === 0) {
            ack?.({ ok: false, message: "User already answered this question" });
            return;
          }

          // Atomic leaderboard update — try existing entry first, then push new
          const leaderboardUpdated = await TriviaGame.updateOne(
            { _id: triviaGameId, "leaderboard.user": userObjectId },
            {
              $inc: {
                "leaderboard.$.totalScore": scoreEarned,
                "leaderboard.$.correctAnswers": isCorrect ? 1 : 0,
                "leaderboard.$.wrongAnswers": isCorrect ? 0 : 1
              }
            }
          );

          if (leaderboardUpdated.modifiedCount === 0) {
            await TriviaGame.updateOne(
              { _id: triviaGameId, "leaderboard.user": { $ne: userObjectId } },
              {
                $push: {
                  leaderboard: {
                    user: userObjectId,
                    totalScore: scoreEarned,
                    correctAnswers: isCorrect ? 1 : 0,
                    wrongAnswers: isCorrect ? 0 : 1,
                    averageResponseTimeMs: safeResponseTimeMs
                  }
                }
              }
            );
          }

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

          ack?.({ ok: true, data: { isCorrect, scoreEarned } });
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
            ack?.({
              ok: false,
              message: "Only creator can manually end current question"
            });
            return;
          }

          if (triviaGame.status !== "in_progress") {
            ack?.({ ok: false, message: "Trivia game is not in progress" });
            return;
          }

          /*
            Manual override flow:
            1. Clear automatic timer
            2. End current question immediately
            3. Emit answer reveal + leaderboard
            4. Auto move to next question after reveal delay
          */
          clearTriviaTimers(triviaGameId);
          await endCurrentTriviaQuestion(io, triviaGameId);

          ack?.({ ok: true });
        } catch (error) {
          console.error("trivia:next-question error:", error);
          ack?.({
            ok: false,
            message: "Server error while manually ending current question"
          });
        }
      }
    );
  });
};