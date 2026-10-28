import { generateMockCase } from './mockCase';
import type { PublicCase, SecretSolution } from './types';

const CASES_KEY = 'ai-mystery-cases';
const SOLUTIONS_KEY = 'ai-mystery-solutions';

export function getStoredCases(): { publicCase: PublicCase; secretSolution: SecretSolution }[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawCases = window.localStorage.getItem(CASES_KEY);
    return rawCases ? JSON.parse(rawCases) : [];
  } catch {
    return [];
  }
}

export function persistCase(publicCase: PublicCase, secretSolution: SecretSolution) {
  if (typeof window === 'undefined') {
    return;
  }

  const existing = getStoredCases();
  const next = [...existing.filter((entry) => entry.publicCase.id !== publicCase.id), { publicCase, secretSolution }];
  window.localStorage.setItem(CASES_KEY, JSON.stringify(next));
  window.localStorage.setItem(`${SOLUTIONS_KEY}:${publicCase.id}`, JSON.stringify(secretSolution));
}

export function getCaseById(id: string) {
  const entries = getStoredCases();
  return entries.find((entry) => entry.publicCase.id === id) ?? null;
}

export function createCaseFromScenario(scenario: string, difficulty: 'easy' | 'medium' | 'hard', tone: 'realistic' | 'noir' | 'cozy') {
  const { publicCase, secretSolution } = generateMockCase(scenario, difficulty, tone);
  persistCase(publicCase, secretSolution);
  return { caseId: publicCase.id, publicCase, secretSolution };
}
