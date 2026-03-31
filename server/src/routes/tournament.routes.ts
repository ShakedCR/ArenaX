import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  joinTournament,
  updateTournament,
  deleteTournament,
  openTournament,
  startTournament
} from "../controllers/tournament.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllTournaments);
router.get("/:id", getTournamentById);

router.post("/", authMiddleware, createTournament);
router.post("/:id/join", authMiddleware, joinTournament);

router.put("/:id", authMiddleware, updateTournament);
router.delete("/:id", authMiddleware, deleteTournament);

router.patch("/:id/open", authMiddleware, openTournament);
router.patch("/:id/start", authMiddleware, startTournament);

export default router;