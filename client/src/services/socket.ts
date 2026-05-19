import { io, Socket } from "socket.io-client";

const SERVER_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

type AckResponse = {
  ok: boolean;
  message?: string;
};

type BlackjackAction = "hit" | "stand" | "double" | "split";

let socket: Socket | null = null;

/**
 * Initialize the Socket.io connection with the user's JWT token.
 * Call this once after the user logs in.
 */
export function connectSocket(token: string): Socket {
  const nextToken = token || localStorage.getItem('token') || undefined;

  if (socket) {
    const currentToken = (socket.auth as { token?: string } | undefined)?.token;

    if (nextToken && currentToken !== nextToken) {
      socket.auth = { token: nextToken };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.disconnect();
        socket.connect();
      }
    } else if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(SERVER_URL, {
    auth: nextToken ? { token: nextToken } : {},
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason: string) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err: Error) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

/**
 * Returns the active socket instance, or null if it was not initialized.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect and clean up the socket.
 * Call this on logout.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── Room helpers ─────────────────────────────────────────────────────────────

export function joinTournamentRoom(tournamentId: string): void {
  socket?.emit("join-tournament-room", tournamentId);
}

export function leaveTournamentRoom(tournamentId: string): void {
  socket?.emit("leave-tournament-room", tournamentId);
}

// ── Game helpers ──────────────────────────────────────────────────────────────

export function joinGame(gameId: string): Promise<AckResponse> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("player:join", { gameId }, (res: AckResponse) => {
      resolve(res);
    });
  });
}

export function requestBlackjackState(gameId: string): Promise<AckResponse> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("blackjack:request-state", { gameId }, (res: AckResponse) => {
      resolve(res);
    });
  });
}

export function sendBlackjackAction(
  gameId: string,
  action: BlackjackAction
): Promise<AckResponse> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("blackjack:player-action", { gameId, action }, (res: AckResponse) => {
      resolve(res);
    });
  });
}