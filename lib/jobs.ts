import type { Difficulty, PublicCase, SecretSolution } from './types';
import type { ProofInput } from './safety';

export type GenerationInput = {
  scenario: string;
  difficulty: Difficulty;
  evidenceText: string;
  proofs: ProofInput[];
};

export type GenerationEvent =
  | { stage: string; percent: number; message: string }
  | { done: true; caseId: string }
  | { error: { code: string; message: string } };

export type GenerationJob = {
  id: string;
  input: GenerationInput;
  events: GenerationEvent[];
  result?: { publicCase: PublicCase; secretSolution: SecretSolution };
  finished: boolean;
};

type JobRegistry = Map<string, GenerationJob>;
const globalJobs = globalThis as typeof globalThis & { __aiMysteryJobs?: JobRegistry };
const jobs = globalJobs.__aiMysteryJobs ?? (globalJobs.__aiMysteryJobs = new Map());

export function createGenerationJob(input: GenerationInput) {
  const jobId = `job-${crypto.randomUUID()}`;
  jobs.set(jobId, { id: jobId, input, events: [], finished: false });
  return jobId;
}

export function getGenerationJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function publishGenerationEvent(jobId: string, event: GenerationEvent) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.events.push(event);
  if ('done' in event || 'error' in event) job.finished = true;
}

export async function runGenerationJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  const stages = [
    { stage: 'case_bible', percent: 18, message: 'Building the crime...' },
    { stage: 'evidence', percent: 48, message: 'Writing the evidence...' },
    { stage: 'proofs', percent: 72, message: 'Adding your proofs...' },
    { stage: 'safety', percent: 92, message: 'Checking the case...' },
  ];

  try {
    const { generateCaseForJob } = await import('./pipeline');
    publishGenerationEvent(jobId, stages[0]);
    const result = await generateCaseForJob(job.input);
    for (const stage of stages.slice(1)) {
      publishGenerationEvent(jobId, stage);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    job.result = result;
    publishGenerationEvent(jobId, { done: true, caseId: result.publicCase.id });
  } catch {
    publishGenerationEvent(jobId, {
      error: { code: 'GENERATION_FAILED', message: 'This case could not be created. Please try again.' },
    });
  }
}

export function getCaseById(caseId: string) {
  for (const job of jobs.values()) {
    if (job.result?.publicCase.id === caseId) return job.result;
  }
  return null;
}