import { calculateTriviaScore, buildRankedLeaderboard } from '../utils/trivia.utils';

const entry = (
  user: string,
  totalScore: number,
  correctAnswers: number,
  averageResponseTimeMs: number,
  wrongAnswers = 0
) => ({ user, totalScore, correctAnswers, wrongAnswers, averageResponseTimeMs });

// ── calculateTriviaScore ───────────────────────────────────────────────────────

describe('calculateTriviaScore', () => {
  test('wrong answer always returns 0 regardless of response time', () => {
    expect(calculateTriviaScore(false, 0, 30)).toBe(0);
    expect(calculateTriviaScore(false, 15000, 30)).toBe(0);
    expect(calculateTriviaScore(false, 30000, 30)).toBe(0);
  });

  test('correct answer at responseTimeMs=0 returns maximum score 1000', () => {
    expect(calculateTriviaScore(true, 0, 30)).toBe(1000);
  });

  test('correct answer at exactly max time returns minimum score 500', () => {
    expect(calculateTriviaScore(true, 30000, 30)).toBe(500);
  });

  test('correct answer at half the allotted time returns 750', () => {
    expect(calculateTriviaScore(true, 15000, 30)).toBe(750);
  });

  test('correct answer at quarter of the allotted time returns 875', () => {
    expect(calculateTriviaScore(true, 7500, 30)).toBe(875);
  });

  test('responseTimeMs beyond timePerQuestion*1000 is clamped to max (returns 500)', () => {
    expect(calculateTriviaScore(true, 99999, 30)).toBe(500);
    expect(calculateTriviaScore(true, 30001, 30)).toBe(500);
  });

  test('negative responseTimeMs is clamped to 0 (returns 1000)', () => {
    expect(calculateTriviaScore(true, -1, 30)).toBe(1000);
    expect(calculateTriviaScore(true, -5000, 30)).toBe(1000);
  });

  test('score for correct answer is always an integer', () => {
    expect(Number.isInteger(calculateTriviaScore(true, 7777, 30))).toBe(true);
    expect(Number.isInteger(calculateTriviaScore(true, 13333, 30))).toBe(true);
  });

  test('score for correct answer is always between 500 and 1000 inclusive', () => {
    for (let ms = 0; ms <= 30000; ms += 1000) {
      const score = calculateTriviaScore(true, ms, 30);
      expect(score).toBeGreaterThanOrEqual(500);
      expect(score).toBeLessThanOrEqual(1000);
    }
  });

  test('score strictly decreases as response time increases', () => {
    const s1 = calculateTriviaScore(true, 5000, 30);
    const s2 = calculateTriviaScore(true, 10000, 30);
    const s3 = calculateTriviaScore(true, 25000, 30);
    expect(s1).toBeGreaterThan(s2);
    expect(s2).toBeGreaterThan(s3);
  });

  test('works correctly with timePerQuestion of 1 second', () => {
    expect(calculateTriviaScore(true, 0, 1)).toBe(1000);
    expect(calculateTriviaScore(true, 500, 1)).toBe(750);
    expect(calculateTriviaScore(true, 1000, 1)).toBe(500);
  });

  test('works correctly with timePerQuestion of 60 seconds', () => {
    expect(calculateTriviaScore(true, 0, 60)).toBe(1000);
    expect(calculateTriviaScore(true, 60000, 60)).toBe(500);
  });
});

// ── buildRankedLeaderboard ─────────────────────────────────────────────────────

describe('buildRankedLeaderboard', () => {
  test('empty leaderboard returns empty array', () => {
    expect(buildRankedLeaderboard([])).toEqual([]);
  });

  test('single player receives rank 1', () => {
    const result = buildRankedLeaderboard([entry('u1', 800, 3, 5000)]);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].user).toBe('u1');
  });

  test('players are ranked by totalScore descending', () => {
    const result = buildRankedLeaderboard([
      entry('low', 300, 1, 5000),
      entry('high', 900, 3, 5000),
      entry('mid', 600, 2, 5000),
    ]);
    expect(result[0].user).toBe('high');
    expect(result[1].user).toBe('mid');
    expect(result[2].user).toBe('low');
  });

  test('ranks are 1-indexed and sequential', () => {
    const result = buildRankedLeaderboard([
      entry('a', 100, 1, 5000),
      entry('b', 200, 2, 5000),
      entry('c', 300, 3, 5000),
    ]);
    expect(result.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  test('tie on totalScore: higher correctAnswers wins', () => {
    const result = buildRankedLeaderboard([
      entry('fewer', 800, 2, 4000),
      entry('more',  800, 3, 6000),
    ]);
    expect(result[0].user).toBe('more');
    expect(result[1].user).toBe('fewer');
  });

  test('tie on totalScore and correctAnswers: lower averageResponseTimeMs wins', () => {
    const result = buildRankedLeaderboard([
      entry('slow', 800, 3, 9000),
      entry('fast', 800, 3, 2000),
    ]);
    expect(result[0].user).toBe('fast');
    expect(result[1].user).toBe('slow');
  });

  test('three-way tie is broken correctly through the full cascade', () => {
    const result = buildRankedLeaderboard([
      entry('slow',  500, 3, 9000),
      entry('fewer', 500, 2, 1000),
      entry('fast',  500, 3, 2000),
    ]);
    expect(result[0].user).toBe('fast');   // same score, same correct, fastest
    expect(result[1].user).toBe('slow');   // same score, same correct, slower
    expect(result[2].user).toBe('fewer');  // same score, fewer correct
  });

  test('original array is not mutated', () => {
    const input = [
      entry('a', 300, 1, 1000),
      entry('b', 100, 0, 2000),
    ];
    const originalFirst = input[0].user;
    buildRankedLeaderboard(input);
    expect(input[0].user).toBe(originalFirst);
    expect(input).toHaveLength(2);
  });

  test('player with highest score wins even if slower than others', () => {
    const result = buildRankedLeaderboard([
      entry('fast-low',  400, 2, 1000),
      entry('slow-high', 900, 4, 9999),
    ]);
    expect(result[0].user).toBe('slow-high');
  });

  test('all players have same score, correct, and time: order is stable but ranks are sequential', () => {
    const result = buildRankedLeaderboard([
      entry('u1', 500, 2, 5000),
      entry('u2', 500, 2, 5000),
    ]);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });
});
