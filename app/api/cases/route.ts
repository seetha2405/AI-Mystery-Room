import { NextResponse } from 'next/server';
import { z } from 'zod';
import { config } from '@/lib/config';
import { createGenerationJob, runGenerationJob } from '@/lib/jobs';
import { checkUserContentSafety, validateImageSignature, type ProofInput } from '@/lib/safety';

const bodySchema = z.object({
  scenario: z.string().trim().min(config.scenarioMinLength).max(config.scenarioMaxLength),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  evidenceText: z.string().max(10000).default(''),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const payload = bodySchema.parse({
      scenario: formData.get('scenario'),
      difficulty: formData.get('difficulty') ?? 'medium',
      evidenceText: formData.get('evidenceText') ?? '',
    });
    const uploadedFiles = formData.getAll('files');
    if (uploadedFiles.length > config.maxProofFiles) {
      return NextResponse.json({ error: { code: 'TOO_MANY_FILES', message: 'Upload no more than 5 proof images.' } }, { status: 400 });
    }

    const proofs: ProofInput[] = [];
    for (const value of uploadedFiles) {
      if (!(value instanceof File)) {
        return NextResponse.json({ error: { code: 'INVALID_FILE', message: 'A proof upload was invalid.' } }, { status: 400 });
      }
      if (!config.allowedProofMimeTypes.includes(value.type as typeof config.allowedProofMimeTypes[number])) {
        return NextResponse.json({ error: { code: 'INVALID_FILE_TYPE', message: 'Proofs must be PNG or JPG images.' } }, { status: 400 });
      }
      if (value.size === 0 || value.size > config.maxProofFileBytes) {
        return NextResponse.json({ error: { code: 'INVALID_FILE_SIZE', message: 'Each proof image must be no larger than 5 MB.' } }, { status: 400 });
      }
      const proof: ProofInput = {
        name: value.name,
        mimeType: value.type,
        base64: Buffer.from(await value.arrayBuffer()).toString('base64'),
      };
      if (!validateImageSignature(proof)) {
        return NextResponse.json({ error: { code: 'INVALID_IMAGE', message: 'An uploaded file is not a valid PNG or JPG image.' } }, { status: 400 });
      }
      proofs.push(proof);
    }

    const safety = await checkUserContentSafety({
      scenario: payload.scenario,
      evidenceText: payload.evidenceText,
      proofs,
    });
    if (!safety.safe) {
      return NextResponse.json({ error: { code: 'UNSAFE_INPUT', message: safety.message } }, { status: 400 });
    }

    const jobId = createGenerationJob({ ...payload, proofs });
    void runGenerationJob(jobId);

    return NextResponse.json({ jobId });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: error instanceof z.ZodError
            ? 'Use a case description between 10 and 1,000 characters, with valid proof uploads.'
            : 'Your case could not be created. Please check the details and try again.',
        },
      },
      { status: 400 },
    );
  }
}
