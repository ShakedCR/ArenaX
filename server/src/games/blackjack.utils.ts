/**
 * blackjack.utils.ts — Pure card and deck utilities for Blackjack.
 *
 * No game-state side-effects here. Anything that works solely on cards/arrays
 * lives here so the engine class stays focused on game flow and turn management.
 */

import type { Card } from "./blackjack.types";

// ── Deck constants ─────────────────────────────────────────────────────────────

export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// ── Card helpers ───────────────────────────────────────────────────────────────

export const rankValue = (rank: string): number => {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank);
};

export const shuffle = <T>(arr: T[]): T[] => {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

export const buildDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  return shuffle(deck);
};

// ── Hand evaluation ────────────────────────────────────────────────────────────

export const handValue = (cards: Card[]): { hi: number; lo: number; soft: boolean } => {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += card.value;
    }
  }

  const lo = total - aces * 10;
  const initiallySoft = aces > 0 && total <= 21;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return { hi: total, lo, soft: initiallySoft && total <= 21 };
};

export const isBust = (cards: Card[]): boolean => handValue(cards).hi > 21;

/** Natural blackjack: exactly 2 cards totalling 21 */
export const isBlackjack = (cards: Card[]): boolean =>
  cards.length === 2 && handValue(cards).hi === 21;

/** Dealer must hit soft 17 */
export const isSoftSeventeen = (cards: Card[]): boolean => {
  const { hi, soft } = handValue(cards);
  return hi === 17 && soft;
};
