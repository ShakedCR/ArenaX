import { Router } from "express";
import {
  getMyWallet,
  depositToWallet,
  withdrawFromWallet
} from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMyWallet);
router.post("/deposit", authMiddleware, depositToWallet);
router.post("/withdraw", authMiddleware, withdrawFromWallet);

export default router;