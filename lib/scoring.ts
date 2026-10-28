import type { Difficulty } from './types';

export function calculateScore({
  correct,
  difficulty,
  hintsUsed,
  secondsSpent,
}: {
  correct: boolean;
  difficulty: Difficulty;
  hintsUsed: number;
  secondsSpent: number;
}) {
  if (!correct) {
    return 0;
  }

  const multiplier = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.25 : 1;
  const timePenalty = Math.max(0, Math.floor((secondsSpent - 600) / 10));
  const score = Math.max(400, Math.min(1000, Math.round(1000 * multiplier - hintsUsed * 150 - timePenalty)));

  return score;
}
