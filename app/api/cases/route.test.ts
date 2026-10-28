import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getPublicCase } from './[id]/route';
import { POST as createCase } from './route';
import { getGenerationJob } from '@/lib/jobs';

async function createAndFetchCase(withProofs: boolean) {
  const formData = new FormData();
  formData.set('scenario', 'A jewel disappears during a wedding rehearsal.');
  formData.set('difficulty', 'medium');
  formData.set('evidenceText', withProofs ? 'A chat log says the service door opened at 20:14.' : '');
  if (withProofs) {
    formData.append('files', new File([
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ], 'corridor.png', { type: 'image/png' }));
  }

  const response = await createCase(new Request('http://localhost/api/cases', {
    method: 'POST',
    body: formData,
  }));
  expect(response.status).toBe(200);
  const { jobId } = await response.json() as { jobId: string };
  const job = getGenerationJob(jobId);
  expect(job).not.toBeNull();
  await vi.waitFor(() => expect(job?.finished).toBe(true), { timeout: 5000 });
  const completed = job?.events.find((event) => 'done' in event);
  if (!completed || !('caseId' in completed)) throw new Error('Generation did not complete');

  const caseResponse = await getPublicCase(new Request(`http://localhost/api/cases/${completed.caseId}`), {
    params: Promise.resolve({ id: completed.caseId }),
  });
  return { caseResponse, completed };
}

describe('FR-4b FR-4c FR-8a mock multipart generation', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('creates and fetches a case without proofs', async () => {
    vi.stubEnv('USE_MOCK_GEMINI', 'true');
    const { caseResponse } = await createAndFetchCase(false);
    expect(caseResponse.status).toBe(200);
    const publicCase = await caseResponse.json();
    expect(publicCase.evidence.some((item: { source?: string }) => item.source === 'provided')).toBe(false);
    expect(JSON.stringify(publicCase)).not.toContain('culpritId');
  });

  it('creates and fetches a case with image and text proofs', async () => {
    vi.stubEnv('USE_MOCK_GEMINI', 'true');
    const { caseResponse } = await createAndFetchCase(true);
    expect(caseResponse.status).toBe(200);
    const publicCase = await caseResponse.json();
    const providedEvidence = publicCase.evidence.filter((item: { source?: string }) => item.source === 'provided');
    expect(providedEvidence).toHaveLength(2);
    expect(providedEvidence.map((item: { title: string }) => item.title)).toEqual([
      'Provided by you: Image 1',
      'Provided by you: Text evidence',
    ]);
    expect(JSON.stringify(publicCase)).not.toContain('culpritId');
  });

  it('rejects unsupported image types before creating a job', async () => {
    vi.stubEnv('USE_MOCK_GEMINI', 'true');
    const formData = new FormData();
    formData.set('scenario', 'A jewel disappears during a wedding rehearsal.');
    formData.append('files', new File(['not an image'], 'proof.txt', { type: 'text/plain' }));
    const response = await createCase(new Request('http://localhost/api/cases', { method: 'POST', body: formData }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects proof images larger than 5 MB', async () => {
    vi.stubEnv('USE_MOCK_GEMINI', 'true');
    const formData = new FormData();
    formData.set('scenario', 'A jewel disappears during a wedding rehearsal.');
    formData.append('files', new File([
      new Uint8Array(5 * 1024 * 1024 + 1),
    ], 'large.png', { type: 'image/png' }));
    const response = await createCase(new Request('http://localhost/api/cases', { method: 'POST', body: formData }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_FILE_SIZE');
  });

  it('rejects unsafe scenario text before creating a job', async () => {
    vi.stubEnv('USE_MOCK_GEMINI', 'true');
    const formData = new FormData();
    formData.set('scenario', 'Instructions for making a poison for a mystery.');
    const response = await createCase(new Request('http://localhost/api/cases', { method: 'POST', body: formData }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('UNSAFE_INPUT');
  });
});