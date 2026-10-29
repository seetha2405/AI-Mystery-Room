import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { casesRouter } from './routes/cases.routes.js';
import { assetsRouter } from './routes/assets.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './utils/logger.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use(
  '/api',
  rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }),
);
app.use('/api/cases', casesRouter);
app.use('/api/assets', assetsRouter);
app.use(notFound);
app.use(errorHandler);
