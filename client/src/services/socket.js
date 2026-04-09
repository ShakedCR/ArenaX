import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let socket = null;

/**
 * Initialize the Socket.io connection with the user's JWT token.
 * Call this once after the user logs in.
 */
export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

/**
 * Returns the active socket instance (or null if not connected).
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and clean up the socket.
 * Call this on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── Room helpers ─────────────────────────────────────────────────────────────

export function joinTournamentRoom(tournamentId) {
  socket?.emit("join-tournament-room", tournamentId);
}

export function leaveTournamentRoom(tournamentId) {
  socket?.emit("leave-tournament-room", tournamentId);
}
