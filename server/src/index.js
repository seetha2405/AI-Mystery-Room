import { app } from './app.js';
import { connectDatabase, friendlyDatabaseError } from './config/db.js';
import { env } from './config/env.js';

try {
  await connectDatabase();
  console.info(`AI mode: ${env.USE_MOCK_AI ? 'mock' : 'gemini'}`);
  app.listen(env.PORT, '0.0.0.0', () =>
    console.info(`AI Mystery Room API listening on port ${env.PORT}`),
  );
} catch {
  console.error('Unable to connect to the database:', friendlyDatabaseError());
  process.exit(1);
}
