import { Router } from "express";
import passport from "../config/passport";
import {
  register,
  login,
  googleAuthSuccess,
  getMe
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: true,
    failureRedirect: "/api/auth/google/failure"
  }),
  googleAuthSuccess
);

router.get("/google/failure", (_req, res) => {
  res.status(401).json({
    message: "Google authentication failed"
  });
});

export default router;