/**
 * elo.utils.ts — Pure Elo rating calculations.
 *
 * Implements standard Elo for 1v1 and adapts it for multiplayer (3+ players)
 * using a round-robin pairwise approach: each player is compared against every
 * other player and the deltas are averaged so the final scale matches 1v1.
 *
 * References:
 *   https://en.wikipedia.org/wiki/Elo_rating_system
 *   Multiplayer adaptation: Aldous (2017) "Elo ratings for multi-player games"
 */

/** K-factor: max points transferred per game. 32 is standard for casual play. */
const K = 32;

/**
 * Expected score of player A against player B.
 * Returns a value in [0, 1] — the probability that A wins.
 */
export const expectedScore = (ratingA: number, ratingB: number): number =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

/**
 * New Elo rating after one result.
 * @param rating   Current Elo
 * @param expected Expected score (0–1) from expectedScore()
 * @param actual   Actual score: 1 = win, 0.5 = draw, 0 = loss
 */
export const newElo = (rating: number, expected: number, actual: number): number =>
  Math.max(100, Math.round(rating + K * (actual - expected)));

export interface EloInput {
  playerId: string;
  rating: number;
  /** Final rank (1 = best). Ties share the same rank. */
  rank: number;
}

export interface EloResult {
  playerId: string;
  oldRating: number;
  newRating: number;
  delta: number;
}

/**
 * Calculates new Elo ratings after a multiplayer game.
 *
 * Each player is compared pairwise against every other player:
 *   - actual score = 1   if this player ranked higher (better)
 *   - actual score = 0.5 if tied
 *   - actual score = 0   if ranked lower (worse)
 *
 * All individual pairwise deltas are summed then divided by (n-1) so that
 * the total delta for any player stays in roughly the same range as a 1v1 game.
 */
export const calculateMultiplayerElo = (players: EloInput[]): EloResult[] => {
  const n = players.length;
  if (n < 2) return players.map(p => ({ playerId: p.playerId, oldRating: p.rating, newRating: p.rating, delta: 0 }));

  return players.map((player, i) => {
    let rawDelta = 0;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const opponent = players[j];
      const expected = expectedScore(player.rating, opponent.rating);
      const actual =
        player.rank < opponent.rank ? 1 :
        player.rank === opponent.rank ? 0.5 : 0;

      rawDelta += K * (actual - expected);
    }

    // Normalise so scale stays comparable to a single 1v1 match
    const delta = Math.round(rawDelta / (n - 1));
    const newRating = Math.max(100, player.rating + delta);

    return { playerId: player.playerId, oldRating: player.rating, newRating, delta };
  });
};
