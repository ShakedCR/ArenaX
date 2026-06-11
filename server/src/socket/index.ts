import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { setupBlackjackSocket } from "./blackjack.socket";
import { setupChessSocket } from "./chess.socket";
import { setupCheckersSocket } from "./checkers.socket";
import BlackjackGameStateModel from "../models/blackjack-game-state.model";

const RECONNECT_TIMEOUT_MS = 60_000;

type SafeAck = (payload: { ok: boolean; message?: string }) => void;

interface PlayerJoinPayload {
  gameId: string;
}

interface GameMovePayload {
  gameId: string;
  move: unknown;
}

interface GameStatePayload {
  gameId: string;
  state: unknown;
}

interface GameEndPayload {
  gameId: string;
  result: unknown;
}

interface TournamentUpdatePayload {
  tournamentId: string;
  leaderboard: unknown;
}

interface PersistedGameState {
  stateSnapshot: unknown;
  leaderboard: unknown;
  status: "active" | "completed";
  lastAction: string;
  updatedAt: Date;
}

const userCurrentGameRoom = new Map<string, string>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();

// ── Shared io accessor ────────────────────────────────────────────────────────
// Controllers that need to emit socket events (e.g. startTournament emitting
// blackjack:game-start) import getIO() instead of receiving io as a parameter.
let _io: Server;
export const getIO = (): Server => {
  if (!_io) throw new Error("Socket.io server not initialized yet");
  return _io;
};

const reconnectKey = (gameId: string, userId: string): string => `${gameId}:${userId}`;
const gameRoomName = (gameId: string): string => `game:${gameId}`;

const getPersistedGameState = async (gameId: string): Promise<PersistedGameState | null> => {
  return BlackjackGameStateModel.findOne({ gameId })
    .select("stateSnapshot leaderboard status lastAction updatedAt")
    .lean<PersistedGameState>()
    .exec();
};

/**
 * Socket Event Contract (server-level, game-agnostic)
 *
 * CLIENT -> SERVER:
 * - player:join            { gameId }
 * - game:move              { gameId, move }
 * - game:state             { gameId, state }
 * - game:end               { gameId, result }
 * - tournament:update      { tournamentId, leaderboard }
 *
 * SERVER -> CLIENT:
 * - player:join            { gameId, userId, reconnected, at }
 * - player:disconnect      { gameId, userId, reconnectTimeoutMs, at }
 * - player:reconnect       { gameId, userId, at }
 * - game:move              { gameId, playerId, move, at }
 * - game:state             { gameId, state, updatedBy, at }
 * - game:end               { gameId, result, endedBy, at }
 * - tournament:update      { tournamentId, leaderboard, updatedBy, at }
 */

export function initSocketServer(httpServer: http.Server): Server {
  const clientOrigins = [process.env.CLIENT_URL].filter(Boolean);

  _io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (clientOrigins.includes(origin)) return callback(null, true);
        // Allow any localhost/127.0.0.1 origin with any port to simplify local dev
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return callback(null, true);
        return callback(new Error('CORS origin denied'));
      },
      credentials: true
    }
  });
  const io = _io;

  // Auth middleware — validates JWT token sent in socket handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      // JWT is signed with { userId } — must match the key used in auth.controller.ts
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    // Join personal room so controllers can emit events to a specific user
    socket.join(`user:${userId}`);

    const cleanupReconnectTimer = (gameId: string): boolean => {
      const key = reconnectKey(gameId, userId);
      const timer = reconnectTimers.get(key);
      if (!timer) return false;

      clearTimeout(timer);
      reconnectTimers.delete(key);
      return true;
    };

    // ── Room Management ──────────────────────────────────────────────────────
    socket.on("join-tournament-room", (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
      socket.to(`tournament:${tournamentId}`).emit("tournament:player-joined", { userId });
    });

    socket.on("leave-tournament-room", (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on("player:join", async (payload: PlayerJoinPayload, ack?: SafeAck) => {
      if (!payload?.gameId) {
        ack?.({ ok: false, message: "gameId is required" });
        return;
      }

      const { gameId } = payload;
      const room = gameRoomName(gameId);
      const wasDisconnected = cleanupReconnectTimer(gameId);

      userCurrentGameRoom.set(userId, gameId);
      socket.join(room);

      io.to(room).emit("player:join", {
        gameId,
        userId,
        reconnected: wasDisconnected,
        at: new Date().toISOString()
      });

      if (wasDisconnected) {
        const persistedGame = await getPersistedGameState(gameId);

        io.to(room).emit("player:reconnect", {
          gameId,
          userId,
          restoredFrom: persistedGame ? "database" : null,
          at: new Date().toISOString()
        });

        if (persistedGame) {
          socket.emit("game:state", {
            gameId,
            state: persistedGame.stateSnapshot,
            leaderboard: persistedGame.leaderboard,
            status: persistedGame.status,
            lastAction: persistedGame.lastAction,
            updatedAt: persistedGame.updatedAt,
            updatedBy: "system",
            source: "database",
            at: new Date().toISOString()
          });
        }
      }

      ack?.({ ok: true });
    });

    socket.on("game:move", (payload: GameMovePayload, ack?: SafeAck) => {
      if (!payload?.gameId) {
        ack?.({ ok: false, message: "gameId is required" });
        return;
      }

      const { gameId, move } = payload;
      const room = gameRoomName(gameId);

      io.to(room).emit("game:move", {
        gameId,
        playerId: userId,
        move,
        at: new Date().toISOString()
      });

      ack?.({ ok: true });
    });

    socket.on("game:state", (payload: GameStatePayload, ack?: SafeAck) => {
      if (!payload?.gameId) {
        ack?.({ ok: false, message: "gameId is required" });
        return;
      }

      const { gameId, state } = payload;
      const room = gameRoomName(gameId);

      io.to(room).emit("game:state", {
        gameId,
        state,
        updatedBy: userId,
        at: new Date().toISOString()
      });

      ack?.({ ok: true });
    });

    socket.on("game:end", (payload: GameEndPayload, ack?: SafeAck) => {
      if (!payload?.gameId) {
        ack?.({ ok: false, message: "gameId is required" });
        return;
      }

      const { gameId, result } = payload;
      const room = gameRoomName(gameId);

      io.to(room).emit("game:end", {
        gameId,
        result,
        endedBy: userId,
        at: new Date().toISOString()
      });

      ack?.({ ok: true });
    });

    socket.on("tournament:update", (payload: TournamentUpdatePayload, ack?: SafeAck) => {
      if (!payload?.tournamentId) {
        ack?.({ ok: false, message: "tournamentId is required" });
        return;
      }

      const { tournamentId, leaderboard } = payload;

      io.to(`tournament:${tournamentId}`).emit("tournament:update", {
        tournamentId,
        leaderboard,
        updatedBy: userId,
        at: new Date().toISOString()
      });

      ack?.({ ok: true });
    });

    socket.on("disconnect", () => {
      const gameId = userCurrentGameRoom.get(userId);
      if (!gameId) return;

      const room = gameRoomName(gameId);
      io.to(room).emit("player:disconnect", {
        gameId,
        userId,
        reconnectTimeoutMs: RECONNECT_TIMEOUT_MS,
        at: new Date().toISOString()
      });

      const key = reconnectKey(gameId, userId);

      const timer = setTimeout(() => {
        reconnectTimers.delete(key);
        userCurrentGameRoom.delete(userId);
      }, RECONNECT_TIMEOUT_MS);

      reconnectTimers.set(key, timer);
    });
  });

  setupBlackjackSocket(io);
  setupChessSocket(io);
  setupCheckersSocket(io);

  return io;
}
