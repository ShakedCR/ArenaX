import { BaseGameState } from "./IGameEngine";

// ── Card & Hand types ──────────────────────────────────────────────────────────

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: "playing" | "stand" | "bust" | "done" | "blackjack";
  roundDelta: number;
  isDoubled: boolean;
  isSplit: boolean;
  splitFromAce: boolean;
}

export interface PlayerState {
  playerId: string;
  name: string;
  tokens: number;
  hands: Hand[];
  activeHandIndex: number;
  status: "waiting" | "betting" | "playing" | "stand" | "bust" | "done";
  roundDelta: number;
  hasBet: boolean;
  cards: Card[];
  bet: number;
  initialBet: number;
  forfeited?: boolean;
}

export interface BlackjackGameState extends BaseGameState {
  currentRound: number;
  totalRounds: number;
  phase: "waiting" | "betting" | "playing" | "dealer-turn" | "round-over" | "game-over";
  deck: Card[];
  dealerCards: Card[];
  dealerHidden: boolean;
  playerStates: PlayerState[];
  currentPlayerIndex: number;
  roundActive: boolean;
}

export type BlackjackMove = "hit" | "stand" | "double" | "split";
