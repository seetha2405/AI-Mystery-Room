import { env } from '../config/env.js';
import { makeMockCase } from './mockCase.js';
import { validateCase } from './caseValidator.js';
import { generateMystery } from './gemini.service.js';
import { AppError } from '../utils/AppError.js';

const BACKOFF_MS = [2000, 5000];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus(error) {
  return error?.status ?? error?.statusCode ?? null;
}

function isValidationError(error) {
  return error?.code === 'INVALID_AI_OUTPUT' || (error?.status === 502 && error?.details);
}

function isTransient(error) {
  const status = getStatus(error);
  return (
    status === 429 ||
    status === 503 ||
    (status === 502 && !isValidationError(error)) ||
    /quota|rate.?limit|resource exhausted|high demand|temporarily unavailable/i.test(
      error?.message || '',
    )
  );
}

function isTimeout(error) {
  return error?.code === 'AI_TIMEOUT';
}

function asPublicError(error) {
  if (error?.status === 422) return error;

  const status = getStatus(error);
  if (isTransient(error))
    return new AppError(503, 'AI_BUSY', 'The AI is busy right now. Please try again in a minute.');
  if (isTimeout(error))
    return new AppError(504, 'AI_TIMEOUT', 'Case generation took too long. Please try again.');
  if (
    status === 401 ||
    status === 403 ||
    /api[_ ]key|unauthorized|permission denied|not configured/i.test(error?.message || '')
  )
    return new AppError(502, 'AI_AUTH', 'AI generation is not configured correctly.');
  if (status === 404 || /model.*(not found|does not exist)|not found.*model/i.test(error?.message || ''))
    return new AppError(502, 'AI_MODEL', 'The configured AI model is unavailable.');
  return new AppError(
    502,
    'AI_VALIDATION',
    'The AI could not build a valid case. Please try a different premise.',
  );
}

async function withGenerationTimeout(task) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('Generation request timed out.');
          error.code = 'AI_TIMEOUT';
          reject(error);
        }, env.GEMINI_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function createCaseContent({ premise, difficulty, uploads = [] }) {
  const safePremise = premise.replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (env.USE_MOCK_AI)
    return validateCase(
      makeMockCase(safePremise, difficulty, uploads.length),
      difficulty,
      uploads.length,
    );

  const primaryModel = env.GEMINI_TEXT_MODEL;
  const fallbackModel = env.GEMINI_FALLBACK_MODEL;
  let model = primaryModel;
  let feedback = '';
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let retryIndex = 0;
    while (true) {
      try {
        const content = await withGenerationTimeout(
          generateMystery({
            premise: safePremise,
            difficulty,
            uploads,
            feedback,
            model,
          }),
        );
        const validContent = validateCase(content, difficulty, uploads.length);
        console.info('Gemini case generation succeeded:', { model, attempt });
        return validContent;
      } catch (error) {
        const status = getStatus(error);
        console.warn('Gemini case generation attempt failed:', {
          model,
          attempt,
          requestAttempt: retryIndex + 1,
          status,
          category: isTimeout(error)
            ? 'timeout'
            : isValidationError(error)
              ? 'validation'
              : 'provider',
          timeout: isTimeout(error),
        });
        if (error?.status === 422) throw error;
        lastError = error;

        if (isTransient(error) && retryIndex < BACKOFF_MS.length) {
          await wait(BACKOFF_MS[retryIndex++]);
          continue;
        }

        if (
          (isTransient(error) || isTimeout(error)) &&
          model === primaryModel &&
          fallbackModel !== primaryModel
        ) {
          model = fallbackModel;
        } else if (isValidationError(error)) {
          feedback = `Previous output failed validation. Correct these issues: ${error.message}`;
        }
        break;
      }
    }
  }

  throw asPublicError(lastError);
}
