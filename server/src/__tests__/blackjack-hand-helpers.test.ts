import { canSplit, canDouble, createHand, extraCommitted } from '../blackjack/hand-helpers';
import type { PlayerState, Card } from '../blackjack/types';

const card = (rank: string): Card => {
  const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
  return { suit: 'hearts', rank, value };
};

const makePlayer = (cards: Card[], tokens = 1000, bet = 100, extraHands: Card[][] = []): PlayerState => {
  const firstHand = createHand(bet);
  firstHand.cards = cards;

  const hands = [
    firstHand,
    ...extraHands.map(c => { const h = createHand(bet); h.cards = c; return h; })
  ];

  return {
    playerId: 'player1',
    name: 'Test',
    tokens,
    initialBet: bet,
    hands,
    activeHandIndex: 0,
    cards,
    bet,
    hasBet: true,
    roundDelta: 0,
    status: 'playing',
  };
};

// ── canSplit ──────────────────────────────────────────────────────────────────

describe('canSplit', () => {
  test('pair of same rank allows split', () => {
    const ps = makePlayer([card('8'), card('8')]);
    expect(canSplit(ps)).toBe(true);
  });

  test('pair of face cards allows split', () => {
    const ps = makePlayer([card('K'), card('K')]);
    expect(canSplit(ps)).toBe(true);
  });

  test('different ranks cannot split', () => {
    const ps = makePlayer([card('8'), card('9')]);
    expect(canSplit(ps)).toBe(false);
  });

  test('3 cards cannot split', () => {
    const ps = makePlayer([card('8'), card('8'), card('2')]);
    expect(canSplit(ps)).toBe(false);
  });

  test('cannot split with insufficient tokens', () => {
    const ps = makePlayer([card('8'), card('8')], 50, 100);
    expect(canSplit(ps)).toBe(false);
  });

  test('cannot split when already at 4 hands', () => {
    const ps = makePlayer(
      [card('8'), card('8')],
      1000, 100,
      [[card('8'), card('8')], [card('8'), card('8')], [card('8'), card('8')]]
    );
    expect(canSplit(ps)).toBe(false);
  });
});

// ── canDouble ─────────────────────────────────────────────────────────────────

describe('canDouble', () => {
  test('2 cards with enough tokens allows double', () => {
    const ps = makePlayer([card('5'), card('6')]);
    expect(canDouble(ps)).toBe(true);
  });

  test('3 cards cannot double', () => {
    const ps = makePlayer([card('5'), card('4'), card('2')]);
    expect(canDouble(ps)).toBe(false);
  });

  test('cannot double with insufficient tokens', () => {
    const ps = makePlayer([card('5'), card('6')], 50, 100);
    expect(canDouble(ps)).toBe(false);
  });

  test('exact tokens equal to bet allows double', () => {
    const ps = makePlayer([card('5'), card('6')], 100, 100);
    expect(canDouble(ps)).toBe(true);
  });
});

// ── extraCommitted ─────────────────────────────────────────────────────────────

describe('extraCommitted', () => {
  test('single hand, no extra committed', () => {
    const ps = makePlayer([card('5'), card('6')], 1000, 100);
    expect(extraCommitted(ps)).toBe(0);
  });

  test('two hands (after split) commits extra bet', () => {
    const ps = makePlayer([card('8'), card('8')], 1000, 100, [[card('8'), card('3')]]);
    expect(extraCommitted(ps)).toBe(100);
  });
});

// ── createHand ────────────────────────────────────────────────────────────────

describe('createHand', () => {
  test('creates empty hand with correct bet', () => {
    const hand = createHand(200);
    expect(hand.bet).toBe(200);
    expect(hand.cards).toHaveLength(0);
    expect(hand.status).toBe('playing');
    expect(hand.isDoubled).toBe(false);
    expect(hand.isSplit).toBe(false);
  });
});
