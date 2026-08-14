import { Router } from "express";
import {
  getCurrentUserProfile,
  getAllUsers,
  getUserById,
  updateUserById,
  updateUserAvatar,
  deleteUserById,
  getUserTournaments,
  getUserMatches,
  getUserStats
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const router = Router();

/* ================= Protected routes ================= */

router.get("/me", authMiddleware, getCurrentUserProfile);

/* ================= Public routes ================= */

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.get("/:id/tournaments", getUserTournaments);
router.get("/:id/matches", getUserMatches);
router.get("/:id/stats", getUserStats);

/* ================= Protected management routes ================= */

router.put("/:id/avatar", authMiddleware, uploadAvatar, updateUserAvatar);
router.put("/:id", authMiddleware, updateUserById);
router.delete("/:id", authMiddleware, deleteUserById);

export default router;