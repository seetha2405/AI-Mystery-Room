import { z } from 'zod';
export const createCaseSchema = z
  .object({
    premise: z.string().trim().min(20).max(500),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })
  .strict();
export const accuseSchema = z.object({ suspectId: z.string().min(1).max(40) }).strict();
export const idSchema = z.string().uuid();
export const clueIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/);
