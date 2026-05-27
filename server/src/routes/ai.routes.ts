import { Router } from "express";
import { analyzeMatch } from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/matches/:matchId/analyze", authMiddleware, analyzeMatch);

export default router;