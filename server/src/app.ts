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
import triviaRoutes from "./routes/trivia.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

const clientOrigins = [process.env.CLIENT_URL].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools (no origin)
      if (!origin) return callback(null, true);
      // allow exact configured origins
      if (clientOrigins.includes(origin)) return callback(null, true);
      // Allow any localhost/127.0.0.1 origin with any port to simplify local dev
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return callback(null, true);
      return callback(new Error('CORS origin denied'));
    },
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

// API v1 routes
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/trivia", triviaRoutes);


// 404 handler
app.use("*", notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;