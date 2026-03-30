import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "ArenaX backend is healthy"
  });
});

export default router;