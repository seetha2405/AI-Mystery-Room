import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ai-mystery-room'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_TEXT_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ENABLE_VIDEO: z.preprocess(
    (value) => (value === undefined ? false : value === 'true' || value === true),
    z.boolean(),
  ),
  USE_MOCK_AI: z.preprocess(
    (value) => (value === undefined ? true : value === 'true' || value === true),
    z.boolean(),
  ),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment configuration:',
    parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; '),
  );
  process.exit(1);
}
export const env = parsed.data;
