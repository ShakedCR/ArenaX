import { Router } from "express";
import {
  createTournament,
  getAllTournaments,
  getMyTournaments,
  getTournamentById,
  joinTournament,
  updateTournament,
  deleteTournament,
  openTournament,
  startTournament,
  getTournamentInviteLink,
  getTournamentByInviteCode,
  joinTournamentByInviteCode,
  regenerateTournamentInviteCode,
  getQRCode
} from "../blackjack/tournament.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/* ================= Public routes ================= */
router.get("/", getAllTournaments);
router.get("/invite/:inviteCode", getTournamentByInviteCode);

/* ================= Protected routes ================= */
router.get("/my", authMiddleware, getMyTournaments);
router.get("/:id", getTournamentById);
router.get("/:id/qr", authMiddleware, getQRCode);
router.post("/", authMiddleware, createTournament);
router.post("/:id/join", authMiddleware, joinTournament);
router.post("/invite/:inviteCode/join", authMiddleware, joinTournamentByInviteCode);
router.get("/:id/invite-link", authMiddleware, getTournamentInviteLink);
router.patch("/:id/regenerate-invite", authMiddleware, regenerateTournamentInviteCode);
router.put("/:id", authMiddleware, updateTournament);
router.delete("/:id", authMiddleware, deleteTournament);
router.patch("/:id/open", authMiddleware, openTournament);
router.patch("/:id/start", authMiddleware, startTournament);

export default router;