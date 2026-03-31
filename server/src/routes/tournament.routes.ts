import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  joinTournament,
  updateTournament,
  deleteTournament,
  openTournament,
  startTournament,
  getTournamentInviteLink,
  getTournamentByInviteCode,
  joinTournamentByInviteCode,
  regenerateTournamentInviteCode
} from "../controllers/tournament.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/* ================= Public routes ================= */

router.get("/", getAllTournaments);
router.get("/invite/:inviteCode", getTournamentByInviteCode);
router.get("/:id", getTournamentById);
router.patch("/:id/regenerate-invite", authMiddleware, regenerateTournamentInviteCode);

/* ================= Protected routes ================= */

router.post("/", authMiddleware, createTournament);
router.post("/:id/join", authMiddleware, joinTournament);
router.post("/invite/:inviteCode/join", authMiddleware, joinTournamentByInviteCode);

router.get("/:id/invite-link", authMiddleware, getTournamentInviteLink);

router.put("/:id", authMiddleware, updateTournament);
router.delete("/:id", authMiddleware, deleteTournament);

router.patch("/:id/open", authMiddleware, openTournament);
router.patch("/:id/start", authMiddleware, startTournament);

export default router;