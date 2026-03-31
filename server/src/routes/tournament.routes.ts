import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  joinTournament
} from "../controllers/tournament.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);
router.post("/", authMiddleware, createTournament);
router.post("/:id/join", authMiddleware, joinTournament);

export default router;