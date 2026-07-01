import { handValue, isBust, isBlackjack, isSoftSeventeen, buildDeck, SUITS, RANKS } from '../blackjack/utils';
import type { Card } from '../blackjack/types';

const card = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' = 'hearts'): Card => {
  const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
  return { suit, rank, value };
};

// ── handValue ─────────────────────────────────────────────────────────────────

describe('handValue', () => {
  test('A + 6 = soft 17', () => {
    const result = handValue([card('A'), card('6')]);
    expect(result.hi).toBe(17);
    expect(result.soft).toBe(true);
  });

  test('A + K = soft 21 (blackjack)', () => {
    const result = handValue([card('A'), card('K')]);
    expect(result.hi).toBe(21);
    expect(result.soft).toBe(true);
  });

  test('A + A + K = 12 (both aces count as 1)', () => {
    const result = handValue([card('A'), card('A'), card('K')]);
    expect(result.hi).toBe(12);
    expect(result.soft).toBe(false);
  });

  test('5 + 7 + 9 = 21 (hard)', () => {
    const result = handValue([card('5'), card('7'), card('9')]);
    expect(result.hi).toBe(21);
    expect(result.soft).toBe(false);
  });

  test('K + Q = 20', () => {
    const result = handValue([card('K'), card('Q')]);
    expect(result.hi).toBe(20);
    expect(result.soft).toBe(false);
  });

  test('A + 5 + 10 = 16 (ace forced to 1)', () => {
    const result = handValue([card('A'), card('5'), card('10')]);
    expect(result.hi).toBe(16);
    expect(result.soft).toBe(false);
  });
});

// ── isBust ────────────────────────────────────────────────────────────────────

describe('isBust', () => {
  test('K + Q + 5 = bust (25)', () => {
    expect(isBust([card('K'), card('Q'), card('5')])).toBe(true);
  });

  test('K + 5 = not bust (15)', () => {
    expect(isBust([card('K'), card('5')])).toBe(false);
  });

  test('A + K = not bust (21)', () => {
    expect(isBust([card('A'), card('K')])).toBe(false);
  });

  test('A + A + A + 9 = not bust (12)', () => {
    expect(isBust([card('A'), card('A'), card('A'), card('9')])).toBe(false);
  });
});

// ── isBlackjack ───────────────────────────────────────────────────────────────

describe('isBlackjack', () => {
  test('A + K = blackjack', () => {
    expect(isBlackjack([card('A'), card('K')])).toBe(true);
  });

  test('A + Q = blackjack', () => {
    expect(isBlackjack([card('A'), card('Q')])).toBe(true);
  });

  test('A + 10 = blackjack', () => {
    expect(isBlackjack([card('A'), card('10')])).toBe(true);
  });

  test('A + 5 + 5 = not blackjack (3 cards)', () => {
    expect(isBlackjack([card('A'), card('5'), card('5')])).toBe(false);
  });

  test('K + J = not blackjack (20)', () => {
    expect(isBlackjack([card('K'), card('J')])).toBe(false);
  });
});

// ── isSoftSeventeen ───────────────────────────────────────────────────────────

describe('isSoftSeventeen', () => {
  test('A + 6 = soft 17', () => {
    expect(isSoftSeventeen([card('A'), card('6')])).toBe(true);
  });

  test('A + 2 + 4 = soft 17', () => {
    expect(isSoftSeventeen([card('A'), card('2'), card('4')])).toBe(true);
  });

  test('10 + 7 = hard 17, not soft', () => {
    expect(isSoftSeventeen([card('10'), card('7')])).toBe(false);
  });

  test('A + 6 + K = hard 17, not soft (ace forced to 1)', () => {
    expect(isSoftSeventeen([card('A'), card('6'), card('K')])).toBe(false);
  });
});

// ── buildDeck ─────────────────────────────────────────────────────────────────

describe('buildDeck', () => {
  test('returns 52 cards', () => {
    expect(buildDeck()).toHaveLength(52);
  });

  test('contains all 4 suits', () => {
    const deck = buildDeck();
    for (const suit of SUITS) {
      expect(deck.some(c => c.suit === suit)).toBe(true);
    }
  });

  test('contains all 13 ranks per suit', () => {
    const deck = buildDeck();
    for (const suit of SUITS) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(13);
      for (const rank of RANKS) {
        expect(suitCards.some(c => c.rank === rank)).toBe(true);
      }
    }
  });

  test('aces have value 11', () => {
    const deck = buildDeck();
    const aces = deck.filter(c => c.rank === 'A');
    expect(aces).toHaveLength(4);
    aces.forEach(ace => expect(ace.value).toBe(11));
  });

  test('face cards have value 10', () => {
    const deck = buildDeck();
    const faceCards = deck.filter(c => ['J', 'Q', 'K'].includes(c.rank));
    expect(faceCards).toHaveLength(12);
    faceCards.forEach(fc => expect(fc.value).toBe(10));
  });
});
