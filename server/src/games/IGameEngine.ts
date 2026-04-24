/**
 * IGameEngine — Unified interface for all game engines in the platform
 *
 * Every game (Blackjack, Chess, Checkers, etc.) must implement this interface.
 * This allows the Socket.io layer and tournament management logic to work
 * with any game without knowing its internal implementation.
 *
 * Principle: Polymorphism — "Don't know who you are, know what you do"
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Represents a player in the game
 */
export interface GamePlayer {
  id: string;       // MongoDB ObjectId of the user
  name: string;     // Display name
}

/**
 * Possible outcomes of a game
 */
export type GameOutcome = "win" | "loss" | "draw";

/**
 * Game result structure
 */
export interface GameResult {
  winnerId: string | null;   // null in case of a tie
  winnerIds?: string[];      // multiple winners (for tie scenarios)
  isTie?: boolean;
  outcome: GameOutcome;
  reason?: string;           // "checkmate" | "timeout" | "surrender" | "rounds-complete" etc.
}

/**
 * Base game state — each engine extends this type
 */
export interface BaseGameState {
  gameId: string;            // unique game session identifier
  players: GamePlayer[];     // list of players
  isOver: boolean;           // whether the game is finished
  result: GameResult | null; // null if the game is still active
  createdAt: Date;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Every game engine must implement the following methods:
 *
 * createGame  — initialize a new game with players
 * makeMove    — perform a player action
 * getState    — retrieve current game state
 * isGameOver  — check if the game has ended
 * getResult   — retrieve final result (after game ends)
 */
export interface IGameEngine<TState extends BaseGameState, TMove> {
  /**
   * Creates a new game and returns the initial state
   * @param gameId  - unique identifier (usually match._id from MongoDB)
   * @param players - ordered list of players (e.g. index 0 = white in chess)
   */
  createGame(gameId: string, players: GamePlayer[]): TState;

  /**
   * Applies a player move/action and returns the updated state
   * Throws an error if the move is invalid
   * @param gameId   - game identifier
   * @param playerId - player performing the action
   * @param move     - move payload (game-specific)
   */
  makeMove(gameId: string, playerId: string, move: TMove): TState;

  /**
   * Returns the current game state
   * Throws an error if the gameId does not exist
   */
  getState(gameId: string): TState;

  /**
   * Checks whether the game has ended
   */
  isGameOver(gameId: string): boolean;

  /**
   * Returns the game result (null if still active)
   */
  getResult(gameId: string): GameResult | null;
}