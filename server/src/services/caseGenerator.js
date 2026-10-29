import { env } from '../config/env.js';
import { makeMockCase } from './mockCase.js';
import { validateCase } from './caseValidator.js';
import { generateMystery } from './gemini.service.js';
import { AppError } from '../utils/AppError.js';

async function withGenerationTimeout(task, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Case generation timed out after 60 seconds.')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function createCaseContent({ premise, difficulty, uploads = [] }) {
  if (env.USE_MOCK_AI)
    return validateCase(
      makeMockCase(premise, difficulty, uploads.length),
      difficulty,
      uploads.length,
    );
  let feedback = '';
  let lastError;
  const deadline = Date.now() + 60_000;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('Case generation timed out after 60 seconds.');
      const content = await withGenerationTimeout(
        generateMystery({
          premise: premise.replace(/[\x00-\x1f\x7f]/g, '').trim(),
          difficulty,
          uploads,
          feedback,
        }),
        remaining,
      );
      return validateCase(content, difficulty, uploads.length);
    } catch (error) {
      if (error.status === 422) throw error;
      if (error.status === 429 || /quota|rate.?limit|resource exhausted/i.test(error.message))
        throw new AppError(
          503,
          'AI_BUSY',
          'The AI is busy right now. Please try again in a minute.',
        );
      lastError = error;
      feedback = `Previous output failed validation. Correct these issues: ${error.message}`;
    }
  }
  throw new AppError(
    502,
    'AI_GENERATION_FAILED',
    'The AI could not build a fair case. Please try again with a different premise.',
    lastError?.message,
  );
}
