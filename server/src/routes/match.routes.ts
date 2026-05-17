import { Router } from "express";
import {
  getTournamentMatches,
  getTournamentStandings,
  reportMatchResult
} from "../controllers/match.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/tournament/:tournamentId", getTournamentMatches);
router.get("/tournament/:tournamentId/standings", getTournamentStandings);
router.patch("/:matchId/result", authMiddleware, reportMatchResult);

export default router;