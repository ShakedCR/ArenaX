import { Router } from "express";
import {
  getTournamentMatches,
  getTournamentStandings,
  reportMatchResult,
  saveMatchMove
} from "../controllers/match.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/tournament/:tournamentId", getTournamentMatches);
router.get("/tournament/:tournamentId/standings", getTournamentStandings);
router.post("/:matchId/move", authMiddleware, saveMatchMove);
router.patch("/:matchId/result", authMiddleware, reportMatchResult);

export default router;