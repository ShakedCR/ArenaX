import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import { GamePlayer } from "../games/IGameEngine";
import { blackjackEngine, BlackjackGameState, BlackjackMove } from "../games/blackjack.engine";
import BlackjackGameStateModel from "../models/blackjack-game-state.model";

const isValidBlackjackMove = (move: string): move is BlackjackMove =>
  move === "hit" || move === "stand" || move === "double" || move === "split";

const resolvePlayers = async (playerIds: string[]): Promise<GamePlayer[]> => {
  const users = await User.find({ _id: { $in: playerIds } })
    .select("_id fullName username")
    .lean();

  if (users.length !== playerIds.length) {
    throw new Error("One or more players were not found");
  }

  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  return playerIds.map((id) => {
    const user = userById.get(id);
    if (!user) throw new Error(`Player ${id} not found`);
    return { id, name: (user as any).username || (user as any).fullName };
  });
};

const persistBlackjackState = async (
  state: BlackjackGameState,
  lastAction: string
): Promise<void> => {
  const leaderboard = blackjackEngine.getLeaderboard(state.gameId);
  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId: state.gameId },
    {
      $set: {
        status: state.isOver ? "completed" : "active",
        stateSnapshot: state,
        leaderboard,
        lastAction
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const startBlackjackGame = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, playerIds } = req.body as {
      gameId?: string;
      playerIds?: string[];
    };

    if (!Array.isArray(playerIds) || playerIds.length < 2) {
      return res.status(400).json({ message: "playerIds must include at least 2 players" });
    }

    const uniquePlayerIds = [...new Set(playerIds)];

    if (uniquePlayerIds.length < 2) {
      return res.status(400).json({ message: "At least 2 unique players are required" });
    }

    const allIdsValid = uniquePlayerIds.every((id) => Types.ObjectId.isValid(id));
    if (!allIdsValid) {
      return res.status(400).json({ message: "One or more playerIds are invalid" });
    }

    const resolvedGameId =
      gameId && gameId.trim().length > 0 ? gameId : new Types.ObjectId().toString();

    const players = await resolvePlayers(uniquePlayerIds);
    blackjackEngine.createGame(resolvedGameId, players);
    const state = blackjackEngine.startRound(resolvedGameId);
    await persistBlackjackState(state, "start");

    return res.status(201).json({
      message: "Blackjack game started",
      gameId: resolvedGameId,
      state
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ message });
  }
};

export const makeBlackjackMove = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, action } = req.body as { gameId?: string; action?: string };

    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!gameId) return res.status(400).json({ message: "gameId is required" });
    if (!action || !isValidBlackjackMove(action)) {
      return res.status(400).json({ message: "action must be one of: hit, stand, double" });
    }

    const state = blackjackEngine.makeMove(gameId, req.userId, action);
    const leaderboard = blackjackEngine.getLeaderboard(gameId);
    await persistBlackjackState(state, `move:${action}`);

    return res.status(200).json({ message: "Move applied", state, leaderboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(400).json({ message });
  }
};

export const getBlackjackState = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) return res.status(400).json({ message: "game id is required" });

    try {
      const state = blackjackEngine.getState(id);
      const leaderboard = blackjackEngine.getLeaderboard(id);
      return res.status(200).json({ state, leaderboard, source: "memory" });
    } catch {
      const persistedGame = await BlackjackGameStateModel.findOne({ gameId: id })
        .select("stateSnapshot leaderboard status lastAction updatedAt")
        .lean();

      if (!persistedGame) return res.status(404).json({ message: "Game not found" });

      return res.status(200).json({
        state: persistedGame.stateSnapshot,
        leaderboard: (persistedGame as any).leaderboard,
        status: (persistedGame as any).status,
        lastAction: (persistedGame as any).lastAction,
        updatedAt: (persistedGame as any).updatedAt,
        source: "database"
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(404).json({ message });
  }
};