import { GoogleGenAI } from '@google/genai';
import { config } from './config';

export type ProofInput = {
  name: string;
  mimeType: string;
  base64: string;
};

const unsafePatterns = [
  /\b(?:how to|instructions? for|steps? to)\b.{0,60}\b(?:make|build|poison|weapon|bomb|explosive)\b/i,
  /\b(?:sexual violence|sexual assault of a minor|child sexual abuse)\b/i,
  /\b(?:real ongoing crime|active investigation|current police case)\b/i,
];

export function validateImageSignature(proof: ProofInput) {
  const bytes = Buffer.from(proof.base64, 'base64');
  if (proof.mimeType === 'image/png') {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (proof.mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return false;
}

export async function checkUserContentSafety({
  scenario,
  evidenceText,
  proofs,
}: {
  scenario: string;
  evidenceText: string;
  proofs: ProofInput[];
}) {
  const combinedText = `${scenario}\n${evidenceText}`;
  if (unsafePatterns.some((pattern) => pattern.test(combinedText))) {
    return { safe: false, message: 'Please use fictional, non-graphic mystery details without real ongoing cases or instructions for real-world harm.' };
  }

  if (proofs.some((proof) => !validateImageSignature(proof))) {
    return { safe: false, message: 'One of the uploaded images could not be verified as a PNG or JPG.' };
  }

  if (config.mockGemini) {
    return { safe: true as const };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { safe: false, message: 'Case generation is not configured yet. Please try again later.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const parts = [
      {
        text: `Review this user-submitted mystery scenario and evidence. Reject only if it requests real-world harm, graphic violence, sexual violence, sexual content involving minors, a real named person, or an active real-world crime. Return JSON exactly as {"safe": boolean, "reason": string}.\nScenario:\n${scenario}\nPasted evidence:\n${evidenceText}`,
      },
      ...proofs.map((proof) => ({ inlineData: { mimeType: proof.mimeType, data: proof.base64 } })),
    ];
    const response = await ai.models.generateContent({
      model: config.textModel,
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json' },
    });
    const review = JSON.parse(response.text ?? '{}') as { safe?: boolean };
    return review.safe === true
      ? { safe: true as const }
      : { safe: false as const, message: 'This scenario or proof cannot be used. Please try a fictional, non-graphic mystery.' };
  } catch {
    return { safe: false as const, message: 'We could not check that content safely. Please try again.' };
  }
}