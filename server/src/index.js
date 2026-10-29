import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

try {
  await connectDatabase();
  app.listen(env.PORT, '0.0.0.0', () =>
    console.info(`AI Mystery Room API listening on port ${env.PORT}`),
  );
} catch (error) {
  console.error('Unable to connect to the database:', error.message);
  process.exit(1);
}
