/**
 * Determines how many players advance to the next stage.
 *
 * Rules:
 *   ≤ 3 players → 0 (single stage, tournament ends after this round)
 *   4–6 players → ceil(n / 2)
 *   > 6 players → 4
 */
export const getAdvancingCount = (playerCount: number): number => {
  if (playerCount <= 3) return 0;
  if (playerCount <= 6) return Math.ceil(playerCount / 2);
  return 4;
};
