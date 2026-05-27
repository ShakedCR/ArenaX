import { Router } from "express";
import {
  getTournamentMatches,
  reportMatchResult,
  saveMatchMove
} from "../controllers/match.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/* ================= Match Routes ================= */

router.get(
  "/tournament/:tournamentId",
  getTournamentMatches
);

router.post(
  "/:matchId/move",
  authMiddleware,
  saveMatchMove
);

router.patch(
  "/:matchId/result",
  authMiddleware,
  reportMatchResult
);

export default router;