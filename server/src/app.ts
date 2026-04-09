import "dotenv/config";

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import passport from "./config/passport";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import tournamentRoutes from "./routes/tournament.routes";
import matchRoutes from "./routes/match.routes";
import gamesRoutes from "./routes/games.routes";
import userRoutes from "./routes/user.routes";
import walletRoutes from "./routes/wallet.routes";
import transactionRoutes from "./routes/transaction.routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);

app.use(morgan("dev"));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "ArenaX API is running" });
});

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);

export default app;