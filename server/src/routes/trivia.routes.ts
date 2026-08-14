import { Router } from "express";
import {
  createTriviaTournament,
  getTriviaGameByTournament,
  getTriviaLeaderboard,
  getTriviaStandings,
  getTriviaTopicSuggestions,
  nextTriviaQuestion,
  startTriviaGame,
  submitTriviaAnswer
} from "../controllers/trivia.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadDocument } from "../middleware/upload.middleware";

const router = Router();

router.get("/topics/suggestions", getTriviaTopicSuggestions);

router.post("/tournaments", authMiddleware, uploadDocument, createTriviaTournament);

router.get("/tournament/:tournamentId", authMiddleware, getTriviaGameByTournament);
router.get("/tournament/:tournamentId/standings", getTriviaStandings);

router.post("/:triviaGameId/start", authMiddleware, startTriviaGame);
router.post("/:triviaGameId/answer", authMiddleware, submitTriviaAnswer);
router.post("/:triviaGameId/next-question", authMiddleware, nextTriviaQuestion);

router.get("/:triviaGameId/leaderboard", getTriviaLeaderboard);

export default router;