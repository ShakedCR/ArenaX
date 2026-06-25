export const calculateTriviaScore = (
  isCorrect: boolean,
  responseTimeMs: number,
  timePerQuestion: number
): number => {
  if (!isCorrect) return 0;
  const maxTimeMs = timePerQuestion * 1000;
  const safeResponseTime = Math.min(Math.max(responseTimeMs, 0), maxTimeMs);
  const remainingRatio = Math.max(0, (maxTimeMs - safeResponseTime) / maxTimeMs);
  return 500 + Math.round(500 * remainingRatio);
};

export const buildRankedLeaderboard = (leaderboard: any[]) => {
  const sorted = [...leaderboard].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.averageResponseTimeMs - b.averageResponseTimeMs;
  });
  return sorted.map((item, index) => ({
    rank: index + 1,
    ...(item.toObject?.() ?? item),
  }));
};
