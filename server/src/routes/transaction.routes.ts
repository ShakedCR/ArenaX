import { Router } from "express";
import {
  getMyTransactions,
  getTransactionById
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMyTransactions);
router.get("/:id", authMiddleware, getTransactionById);

export default router;