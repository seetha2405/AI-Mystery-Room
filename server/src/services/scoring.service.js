import { DIFFICULTY } from '../config/difficulty.js';

export function calculateScore({ difficulty, correct, cluesDiscovered, hintsUsed }) {
  const base = correct ? DIFFICULTY[difficulty].baseScore : 0;
  const cluePoints = 5 * cluesDiscovered;
  const hintPenalty = 10 * hintsUsed;
  return {
    base,
    cluePoints,
    hintPenalty,
    total: Math.max(0, base + cluePoints - hintPenalty),
    correct,
  };
}
