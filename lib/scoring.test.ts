import { describe, expect, it } from 'vitest';
import { calculateScore } from './scoring';
import { redactSpoiler } from './redaction';

describe('calculateScore', () => {
  it('returns 0 for a wrong answer', () => {
    expect(calculateScore({ correct: false, difficulty: 'medium', hintsUsed: 1, secondsSpent: 120 })).toBe(0);
  });

  it('applies difficulty and hint penalties for a correct answer', () => {
    expect(calculateScore({ correct: true, difficulty: 'medium', hintsUsed: 1, secondsSpent: 600 })).toBe(850);
  });
});

describe('redactSpoiler', () => {
  it('redacts culprit names from public text', () => {
    expect(redactSpoiler('Mara Finch stole the jewel', 'Mara Finch')).toBe('[REDACTED] stole the jewel');
  });
});
