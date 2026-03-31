import { Router } from "express";
import { getTournamentMatches } from "../controllers/match.controller";

const router = Router();

router.get("/tournament/:tournamentId", getTournamentMatches);

export default router;