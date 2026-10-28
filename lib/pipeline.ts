import { GoogleGenAI } from '@google/genai';
import { config } from './config';
import { generateMockCase } from './mockCase';
import type { GenerationInput } from './jobs';
import type { Evidence, PublicCase, SecretSolution } from './types';

async function buildEstablishedFacts(input: GenerationInput) {
  if (config.mockGemini) {
    return input.evidenceText.trim()
      ? `User-provided established facts: ${input.evidenceText.trim()}`
      : 'No pasted proof text was provided.';
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini is not configured');

  const parts = [
    {
      text: `Create Stage 1 facts for a fictional mystery case. Treat the user's scenario, pasted evidence, and every attached image as immutable established facts. Do not contradict, alter, or discard them. Do not identify real people or brands. Return JSON with an establishedFacts string that accurately describes facts supported by the supplied material and a caseBible object containing title, setting, briefing, suspects, culpritId, motive, method, opportunity, timeline, cluePlan, redHerrings, and hints.\nDifficulty: ${input.difficulty}\nScenario: ${input.scenario}\nPasted evidence:\n${input.evidenceText}`,
    },
    ...input.proofs.map((proof) => ({ inlineData: { mimeType: proof.mimeType, data: proof.base64 } })),
  ];
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: config.textModel,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json' },
  });
  const parsed = JSON.parse(response.text ?? '{}') as { establishedFacts?: string };
  if (!parsed.establishedFacts) throw new Error('Stage 1 returned no established facts');
  return parsed.establishedFacts;
}

export async function generateCaseForJob(input: GenerationInput): Promise<{
  publicCase: PublicCase;
  secretSolution: SecretSolution;
}> {
  const establishedFacts = await buildEstablishedFacts(input);
  const { publicCase, secretSolution } = generateMockCase(input.scenario, input.difficulty, 'realistic');
  const providedEvidence: Evidence[] = input.proofs.map((proof, index) => ({
    id: `provided-image-${index + 1}`,
    type: 'image',
    title: `Provided by you: Image ${index + 1}`,
    tags: ['provided'],
    source: 'provided',
    caption: 'Image supplied by the player as established case evidence.',
    imageUrl: `data:${proof.mimeType};base64,${proof.base64}`,
    imageStatus: 'ok',
    altText: `Player-provided proof image ${index + 1}`,
  }));

  if (input.evidenceText.trim()) {
    providedEvidence.push({
      id: 'provided-text-1',
      type: 'document',
      subtype: 'note',
      title: 'Provided by you: Text evidence',
      tags: ['provided'],
      source: 'provided',
      body: input.evidenceText.trim(),
    });
  }

  publicCase.briefing = `${publicCase.briefing}\n\n${establishedFacts}`;
  publicCase.evidence = [...publicCase.evidence, ...providedEvidence];
  return { publicCase, secretSolution };
}