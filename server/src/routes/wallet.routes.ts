import { Router } from "express";
import {
  getMyWallet,
  depositToWallet,
  withdrawFromWallet,
  claimDailyBonus
} from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMyWallet);
router.post("/deposit", authMiddleware, depositToWallet);
router.post("/withdraw", authMiddleware, withdrawFromWallet);
router.post("/daily-bonus", authMiddleware, claimDailyBonus);

export default router;