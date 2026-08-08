import { BlackjackEngine } from '../blackjack/engine';
import type { BlackjackGameState, Card, Hand, PlayerState } from '../blackjack/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const c = (rank: string): Card => ({
  suit: 'hearts',
  rank,
  value: rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank),
});

const makeHand = (cards: Card[], bet = 100, status: Hand['status'] = 'playing'): Hand => ({
  cards,
  bet,
  status,
  roundDelta: 0,
  isDoubled: false,
  isSplit: false,
  splitFromAce: false,
});

const makePlayer = (
  id: string,
  cards: Card[],
  opts: { tokens?: number; bet?: number; status?: PlayerState['status'] } = {}
): PlayerState => {
  const { tokens = 1000, bet = 100, status = 'playing' } = opts;
  return {
    playerId: id,
    name: id,
    tokens,
    bet,
    initialBet: bet,
    hands: [makeHand(cards, bet)],
    activeHandIndex: 0,
    cards,
    hasBet: true,
    roundDelta: 0,
    status,
  };
};

const makeState = (
  players: PlayerState[],
  dealerCards: Card[],
  deck: Card[],
  opts: { currentRound?: number; totalRounds?: number } = {}
): BlackjackGameState => {
  const { currentRound = 1, totalRounds = 5 } = opts;
  return {
    gameId: 'test-game',
    players: players.map(p => ({ id: p.playerId, name: p.name })),
    currentRound,
    totalRounds,
    phase: 'playing',
    deck,
    dealerCards,
    dealerHidden: true,
    playerStates: players,
    currentPlayerIndex: 0,
    roundActive: true,
    isOver: false,
    result: null,
    createdAt: new Date(),
  };
};

// ── Round resolution ───────────────────────────────────────────────────────────

describe('BlackjackEngine - round resolution payouts', () => {
  let engine: BlackjackEngine;

  beforeEach(() => { engine = new BlackjackEngine(); });

  test('player with higher value than dealer wins the bet', () => {
    // P1: 19, P2: 14, Dealer: hard 17 (no draw)
    const p1 = makePlayer('p1', [c('10'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(100);
    expect(state.playerStates[1].roundDelta).toBe(-100);
    expect(state.playerStates[0].tokens).toBe(1100);
    expect(state.playerStates[1].tokens).toBe(900);
  });

  test('blackjack pays 1.5× the bet', () => {
    // P1: A+K (natural BJ), dealer: hard 17
    const p1 = makePlayer('p1', [c('A'), c('K')]);
    const p2 = makePlayer('p2', [c('9'), c('6')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(150); // 1.5 × 100
    expect(state.playerStates[0].tokens).toBe(1150);
  });

  test('player blackjack vs dealer blackjack is a push (delta 0)', () => {
    // Both P1 and dealer have natural 21
    const p1 = makePlayer('p1', [c('A'), c('Q')]);
    const p2 = makePlayer('p2', [c('9'), c('8')], { status: 'waiting' }); // 17
    engine.restoreGame('test-game', makeState([p1, p2], [c('A'), c('J')], []));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(0);   // BJ vs BJ → push
    expect(state.playerStates[1].roundDelta).toBe(-100); // 17 vs dealer BJ → loss
  });

  test('non-blackjack hand loses to dealer blackjack', () => {
    // P1: 19, dealer BJ
    const p1 = makePlayer('p1', [c('10'), c('9')]);
    const p2 = makePlayer('p2', [c('7'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('A'), c('K')], []));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(-100);
    expect(state.playerStates[1].roundDelta).toBe(-100);
  });

  test('all non-busted players win when dealer busts', () => {
    // Dealer: 9+6=15, draws K → 25 (bust). Deck: [K] popped last.
    const p1 = makePlayer('p1', [c('K'), c('8')]); // 18
    const p2 = makePlayer('p2', [c('9'), c('7')], { status: 'waiting' }); // 16
    engine.restoreGame('test-game', makeState([p1, p2], [c('9'), c('6')], [c('K')]));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(100);
    expect(state.playerStates[1].roundDelta).toBe(100);
  });

  test('tie with dealer results in delta 0 (push)', () => {
    // P1: 19 = dealer 19 → push
    const p1 = makePlayer('p1', [c('K'), c('9')]); // 19
    const p2 = makePlayer('p2', [c('8'), c('7')], { status: 'waiting' }); // 15
    engine.restoreGame('test-game', makeState([p1, p2], [c('J'), c('9')], [])); // dealer: 19

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(0);
    expect(state.playerStates[1].roundDelta).toBe(-100);
  });

  test('busted player loses bet regardless of dealer outcome', () => {
    // P1 hits K (on 10+6=16) → 26 bust. Dealer: 8+7=15, draws 5 → 20.
    // Deck (popped right-to-left): K first for P1, then 5 for dealer.
    const p1 = makePlayer('p1', [c('10'), c('6')]);
    const p2 = makePlayer('p2', [c('K'), c('9')], { status: 'waiting' }); // 19
    engine.restoreGame('test-game', makeState([p1, p2], [c('8'), c('7')], [c('5'), c('K')]));

    engine.makeMove('test-game', 'p1', 'hit');  // pops K → bust, auto-done
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].roundDelta).toBe(-100); // busted
    expect(state.playerStates[1].roundDelta).toBe(-100); // 19 < 20
  });

  test('dealer draws to hard 17 and stops', () => {
    // Dealer: 9+5=14, draws 3 → 17 (hard, stops)
    const p1 = makePlayer('p1', [c('K'), c('8')]); // 18
    const p2 = makePlayer('p2', [c('6'), c('5')], { status: 'waiting' }); // 11
    engine.restoreGame('test-game', makeState([p1, p2], [c('9'), c('5')], [c('3')]));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.dealerCards).toHaveLength(3); // drew exactly once
    expect(state.playerStates[0].roundDelta).toBe(100);  // 18 > 17
    expect(state.playerStates[1].roundDelta).toBe(-100); // 11 < 17
  });

  test('dealer draws on soft 17 (A+6)', () => {
    // Dealer: A+6 = soft 17 → must draw. Draws 3 → 20.
    const p1 = makePlayer('p1', [c('K'), c('9')]); // 19
    const p2 = makePlayer('p2', [c('7'), c('8')], { status: 'waiting' }); // 15
    engine.restoreGame('test-game', makeState([p1, p2], [c('A'), c('6')], [c('3')]));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.dealerCards).toHaveLength(3); // drew once on soft 17
    expect(state.playerStates[0].roundDelta).toBe(-100); // 19 < 20
    expect(state.playerStates[1].roundDelta).toBe(-100); // 15 < 20
  });

  test('player tokens cannot go below 0', () => {
    // P1 has exactly 50 tokens and bets 50, loses
    const p1 = makePlayer('p1', [c('5'), c('6')], { tokens: 50, bet: 50 });
    const p2 = makePlayer('p2', [c('K'), c('9')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');
    const state = engine.getState('test-game');

    expect(state.playerStates[0].tokens).toBe(0); // not negative
  });
});

// ── Game finalization ──────────────────────────────────────────────────────────

describe('BlackjackEngine - game finalization', () => {
  let engine: BlackjackEngine;

  beforeEach(() => { engine = new BlackjackEngine(); });

  test('game finalizes after round 5 and sets isOver = true', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]); // 19, wins
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' }); // 14, loses
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], [], { currentRound: 5 }));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');

    expect(engine.isGameOver('test-game')).toBe(true);
  });

  test('winner is the player with more tokens after finalization', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], [], { currentRound: 5 }));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');

    const result = engine.getResult('test-game');
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe('p1');
    expect(result!.isTie).toBe(false);
    expect(result!.outcome).toBe('win');
  });

  test('tie is detected when both players finish with equal tokens', () => {
    // Both push against dealer (delta = 0, tokens stay equal)
    const p1 = makePlayer('p1', [c('K'), c('9')]); // 19
    const p2 = makePlayer('p2', [c('J'), c('9')], { status: 'waiting' }); // 19
    // Dealer: J+9 = 19, no draw needed
    engine.restoreGame('test-game', makeState([p1, p2], [c('9'), c('J')], [], { currentRound: 5 }));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');

    const result = engine.getResult('test-game');
    expect(result!.isTie).toBe(true);
    expect(result!.winnerId).toBeNull();
    expect(result!.winnerIds).toHaveLength(2);
    expect(result!.outcome).toBe('draw');
  });

  test('game finalizes early when only one player has tokens remaining', () => {
    // P2 already has 0 tokens (eliminated in a previous round)
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { tokens: 0, status: 'done' });
    // currentRound = 2 (not the final round), but only 1 active player
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], [], { currentRound: 2 }));

    engine.makeMove('test-game', 'p1', 'stand');

    expect(engine.isGameOver('test-game')).toBe(true);
    expect(engine.getResult('test-game')!.winnerId).toBe('p1');
  });

  test('leaderboard is sorted by token count descending', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]); // wins
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' }); // loses
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], [], { currentRound: 5 }));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');

    const board = engine.getLeaderboard('test-game');
    expect(board[0].playerId).toBe('p1');
    expect(board[0].rank).toBe(1);
    expect(board[1].playerId).toBe('p2');
    expect(board[1].rank).toBe(2);
  });

  test('game does not finalize before round 5 with 2 active players', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], [], { currentRound: 3 }));

    engine.makeMove('test-game', 'p1', 'stand');
    engine.makeMove('test-game', 'p2', 'stand');

    expect(engine.isGameOver('test-game')).toBe(false);
    expect(engine.getResult('test-game')).toBeNull();
  });
});

// ── Forfeit ────────────────────────────────────────────────────────────────────

describe('BlackjackEngine - forfeit', () => {
  let engine: BlackjackEngine;

  beforeEach(() => { engine = new BlackjackEngine(); });

  test('forfeited player has tokens set to 0 and forfeited flag set', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const state = engine.forfeitPlayer('test-game', 'p1');

    expect(state.playerStates[0].tokens).toBe(0);
    expect(state.playerStates[0].forfeited).toBe(true);
  });

  test('game finalizes immediately when only one player remains after forfeit', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    engine.forfeitPlayer('test-game', 'p1');

    expect(engine.isGameOver('test-game')).toBe(true);
    expect(engine.getResult('test-game')!.winnerId).toBe('p2');
  });

  test('forfeiting a player with 0 tokens has no effect on game state', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { tokens: 0, status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    engine.forfeitPlayer('test-game', 'p2');

    expect(engine.isGameOver('test-game')).toBe(false);
    const state = engine.getState('test-game');
    expect(state.playerStates[1].forfeited).toBeUndefined();
  });
});

// ── getAvailableMoves ──────────────────────────────────────────────────────────

describe('BlackjackEngine - getAvailableMoves', () => {
  let engine: BlackjackEngine;

  beforeEach(() => { engine = new BlackjackEngine(); });

  test('always includes hit and stand for a 2-card hand', () => {
    const p1 = makePlayer('p1', [c('5'), c('7')]);
    const p2 = makePlayer('p2', [c('8'), c('9')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const moves = engine.getAvailableMoves('test-game', 'p1');
    expect(moves).toContain('hit');
    expect(moves).toContain('stand');
  });

  test('includes double when 2-card hand with sufficient tokens', () => {
    const p1 = makePlayer('p1', [c('5'), c('6')], { tokens: 1000, bet: 100 });
    const p2 = makePlayer('p2', [c('8'), c('9')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const moves = engine.getAvailableMoves('test-game', 'p1');
    expect(moves).toContain('double');
  });

  test('does not include double when insufficient tokens', () => {
    const p1 = makePlayer('p1', [c('5'), c('6')], { tokens: 50, bet: 100 });
    const p2 = makePlayer('p2', [c('8'), c('9')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const moves = engine.getAvailableMoves('test-game', 'p1');
    expect(moves).not.toContain('double');
  });

  test('includes split for a matching pair', () => {
    const p1 = makePlayer('p1', [c('8'), c('8')]);
    const p2 = makePlayer('p2', [c('9'), c('7')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const moves = engine.getAvailableMoves('test-game', 'p1');
    expect(moves).toContain('split');
  });

  test('returns empty array for unknown player', () => {
    const p1 = makePlayer('p1', [c('8'), c('8')]);
    const p2 = makePlayer('p2', [c('9'), c('7')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    const moves = engine.getAvailableMoves('test-game', 'unknown-player');
    expect(moves).toEqual([]);
  });
});

// ── State errors ───────────────────────────────────────────────────────────────

describe('BlackjackEngine - state validation errors', () => {
  let engine: BlackjackEngine;

  beforeEach(() => { engine = new BlackjackEngine(); });

  test("makeMove throws when it is not the player's turn", () => {
    const p1 = makePlayer('p1', [c('8'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('7')], { status: 'waiting' });
    engine.restoreGame('test-game', makeState([p1, p2], [c('K'), c('7')], []));

    expect(() => engine.makeMove('test-game', 'p2', 'stand')).toThrow('Not your turn');
  });

  test('getState throws for an unknown gameId', () => {
    expect(() => engine.getState('does-not-exist')).toThrow();
  });

  test('restoreGame makes previously unknown state accessible', () => {
    const p1 = makePlayer('p1', [c('K'), c('9')]);
    const p2 = makePlayer('p2', [c('6'), c('8')], { status: 'waiting' });
    const state = makeState([p1, p2], [c('K'), c('7')], []);

    engine.restoreGame('restored-game', state);
    expect(() => engine.getState('restored-game')).not.toThrow();
  });
});
