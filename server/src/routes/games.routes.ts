

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
    getBlackjackState,
    makeBlackjackMove,
    startBlackjackGame
} from "../controllers/games.controller";

const router = Router();

router.post("/blackjack/start", authMiddleware, startBlackjackGame);
router.post("/blackjack/move", authMiddleware, makeBlackjackMove);
router.get("/blackjack/:id/state", authMiddleware, getBlackjackState);

export default router;