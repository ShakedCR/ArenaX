import { Router } from "express";
import {
  getTournamentMatches,
  reportMatchResult
} from "../controllers/match.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/tournament/:tournamentId", getTournamentMatches);
router.patch("/:matchId/result", authMiddleware, reportMatchResult);

export default router;