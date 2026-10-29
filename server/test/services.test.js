import { describe, expect, it } from 'vitest';
import { calculateScore } from '../src/services/scoring.service.js';
import { makeMockCase } from '../src/services/mockCase.js';
import { validateCase } from '../src/services/caseValidator.js';
import { toPublicCase } from '../src/services/sanitize.js';

describe('calculateScore', () => {
  it.each([
    ['easy', 100],
    ['medium', 150],
    ['hard', 200],
  ])('uses the %s base score', (difficulty, base) => {
    expect(
      calculateScore({ difficulty, correct: true, cluesDiscovered: 0, hintsUsed: 0 }).total,
    ).toBe(base);
    expect(
      calculateScore({ difficulty, correct: false, cluesDiscovered: 0, hintsUsed: 0 }).total,
    ).toBe(0);
  });
  it('scores clues, penalizes hints, and floors at zero', () => {
    expect(
      calculateScore({ difficulty: 'medium', correct: true, cluesDiscovered: 4, hintsUsed: 1 }),
    ).toEqual({ base: 150, cluePoints: 20, hintPenalty: 10, total: 160, correct: true });
    expect(
      calculateScore({ difficulty: 'hard', correct: false, cluesDiscovered: 1, hintsUsed: 4 })
        .total,
    ).toBe(0);
  });
});

describe('case validation and public DTO', () => {
  it('accepts a valid fixture for every difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'])
      expect(
        validateCase(
          makeMockCase(
            'A fictional office ledger disappeared during the evening party.',
            difficulty,
          ),
          difficulty,
        ),
      ).toBeTruthy();
  });
  it('rejects incorrect counts, duplicate ids, culprit name leaks, and unordered hints', () => {
    const good = makeMockCase(
      'A fictional office ledger disappeared during the evening party.',
      'easy',
    );
    expect(() => validateCase({ ...good, suspects: good.suspects.slice(1) }, 'easy')).toThrow();
    expect(() =>
      validateCase({ ...good, evidence: [...good.evidence, { ...good.evidence[0] }] }, 'easy'),
    ).toThrow();
    expect(() =>
      validateCase({ ...good, story: `${good.story} ${good.suspects[0].name}` }, 'easy'),
    ).toThrow();
    expect(() =>
      validateCase({ ...good, hints: [{ level: 2, text: 'First hint.' }, good.hints[1]] }, 'easy'),
    ).toThrow();
  });
  it('whitelists the public view and withholds secret solution fields before accusation', () => {
    const fixture = makeMockCase(
      'A fictional office ledger disappeared during the evening party.',
      'easy',
    );
    const publicView = toPublicCase({
      caseId: 'case-id',
      difficulty: 'easy',
      status: 'active',
      ...fixture,
      progress: { discoveredClueIds: [], hintsUsed: 0 },
    });
    const serialized = JSON.stringify(publicView);
    expect(serialized).not.toContain('solution');
    expect(serialized).not.toContain('culpritId');
    expect(serialized).not.toContain('pointsTo');
    expect(serialized).not.toContain('imagePrompt');
    expect(serialized).not.toContain('avatarPrompt');
    expect(publicView.clues.every((clue) => !('text' in clue) && !('kind' in clue))).toBe(true);
  });
});
