import { Hand, PlayerState } from "./types";

/**
 * Returns how many extra tokens the player has committed beyond their initial bet
 * (via splits and doubles). Used for available-funds checks without pre-deducting
 * tokens during the round — all accounting is deferred to resolveRound via roundDelta.
 */
export const extraCommitted = (ps: PlayerState): number =>
  ps.hands.reduce((sum, h) => sum + h.bet, 0) - ps.initialBet;

export const canSplit = (ps: PlayerState): boolean => {
  const activeHand = ps.hands[ps.activeHandIndex];
  if (!activeHand) return false;
  const availableTokens = ps.tokens - extraCommitted(ps);
  return (
    activeHand.cards.length === 2 &&
    activeHand.cards[0].rank === activeHand.cards[1].rank &&
    availableTokens >= activeHand.bet &&
    ps.hands.length < 4
  );
};

export const canDouble = (ps: PlayerState): boolean => {
  const activeHand = ps.hands[ps.activeHandIndex];
  if (!activeHand) return false;
  const availableTokens = ps.tokens - extraCommitted(ps);
  return activeHand.cards.length === 2 && availableTokens >= activeHand.bet;
};

/** Sync the flat ps.cards / ps.bet shortcut fields from the active hand */
export const syncActiveHand = (ps: PlayerState): void => {
  const activeHand = ps.hands[ps.activeHandIndex];
  ps.cards = activeHand?.cards ?? [];
  ps.bet = activeHand?.bet ?? 0;
};

export const createHand = (bet: number): Hand => ({
  cards: [],
  bet,
  status: "playing",
  roundDelta: 0,
  isDoubled: false,
  isSplit: false,
  splitFromAce: false,
});
