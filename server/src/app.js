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
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [env.CLIENT_URL];
      if (env.NODE_ENV !== 'production') allowedOrigins.push('http://localhost:5173');
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use(
  '/api',
  rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }),
);
app.use('/api/cases', casesRouter);
app.use('/api/assets', assetsRouter);
app.use(notFound);
app.use(errorHandler);
