import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const toneSchema = z.enum(['realistic', 'noir', 'cozy']);

export type Difficulty = z.infer<typeof difficultySchema>;
export type Tone = z.infer<typeof toneSchema>;

export const suspectSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  role: z.string(),
  relationshipToVictim: z.string(),
  publicAlibi: z.string(),
  portraitUrl: z.string().optional(),
});

export const evidenceBaseSchema = z.object({
  id: z.string(),
  type: z.enum(['chat', 'image', 'cctv', 'document']),
  title: z.string(),
  tags: z.array(z.string()).default([]),
  source: z.enum(['generated', 'provided']).default('generated'),
});

export const chatEvidenceSchema = evidenceBaseSchema.extend({
  type: z.literal('chat'),
  participants: z.array(z.object({ id: z.string(), displayName: z.string() })),
  messages: z.array(
    z.object({ id: z.string(), senderId: z.string(), text: z.string(), timestamp: z.string() }),
  ),
});

export const imageEvidenceSchema = evidenceBaseSchema.extend({
  type: z.literal('image'),
  caption: z.string(),
  takenAt: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string(),
  imageStatus: z.enum(['ok', 'fallback']),
  altText: z.string(),
});

export const cctvEvidenceSchema = evidenceBaseSchema.extend({
  type: z.literal('cctv'),
  cameraLabel: z.string(),
  frames: z.array(
    z.object({ imageUrl: z.string(), timestamp: z.string(), description: z.string() }),
  ),
  imageStatus: z.enum(['ok', 'fallback']),
});

export const documentEvidenceSchema = evidenceBaseSchema.extend({
  type: z.literal('document'),
  subtype: z.enum(['receipt', 'call_log', 'email', 'access_log', 'note']),
  rows: z.array(z.record(z.string(), z.string())).optional(),
  body: z.string().optional(),
});

export const evidenceSchema = z.union([
  chatEvidenceSchema,
  imageEvidenceSchema,
  cctvEvidenceSchema,
  documentEvidenceSchema,
]);

export type Evidence = z.infer<typeof evidenceSchema>;

export const publicCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  scenarioSeed: z.string(),
  difficulty: difficultySchema,
  tone: toneSchema,
  briefing: z.string(),
  setting: z.string(),
  suspects: z.array(suspectSchema),
  evidence: z.array(evidenceSchema),
  hintsAvailable: z.number().default(3),
  status: z.enum(['open', 'solved', 'failed']),
  createdAt: z.string(),
});

export type PublicCase = z.infer<typeof publicCaseSchema>;

export const secretSolutionSchema = z.object({
  caseId: z.string(),
  culpritId: z.string(),
  motive: z.string(),
  method: z.string(),
  opportunity: z.string(),
  timeline: z.array(z.object({ time: z.string(), event: z.string() })),
  clueMap: z.array(
    z.object({ clueId: z.string(), explanation: z.string(), evidenceIds: z.array(z.string()) }),
  ),
  redHerrings: z.array(
    z.object({ suspectId: z.string(), whatItLooksLike: z.string(), whyItFails: z.string() }),
  ),
  hints: z.array(z.string()).length(3),
});

export type SecretSolution = z.infer<typeof secretSolutionSchema>;

export const accusationSchema = z.object({
  caseId: z.string(),
  sessionId: z.string(),
  suspectId: z.string(),
  reasoning: z.string().max(1000).optional(),
  hintsUsed: z.number().min(0).max(3),
  secondsSpent: z.number().int().nonnegative(),
  correct: z.boolean(),
  score: z.number().int().min(0).max(1000),
  submittedAt: z.string(),
});

export type Accusation = z.infer<typeof accusationSchema>;

export const scenarioInputSchema = z.object({
  scenario: z.string().trim().min(10).max(1000),
  difficulty: difficultySchema.default('medium'),
  tone: toneSchema.default('realistic'),
});

export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
