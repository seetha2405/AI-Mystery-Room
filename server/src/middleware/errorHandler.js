import { AppError } from '../utils/AppError.js';
export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
}
export function errorHandler(error, _req, res, _next) {
  const known = error instanceof AppError;
  const databaseUnavailable = /MongoServerSelectionError|MongoNetworkError|MongooseServerSelectionError/.test(error?.name || '');
  const status = known
    ? error.status
    : databaseUnavailable
      ? 503
    : error.code === 'LIMIT_FILE_SIZE'
      ? 413
      : error.name === 'MulterError'
        ? 400
        : 500;
  const code = known
    ? error.code
    : databaseUnavailable
      ? 'SERVICE_UNAVAILABLE'
    : error.code === 'LIMIT_FILE_SIZE'
      ? 'FILE_TOO_LARGE'
      : status === 500
        ? 'INTERNAL_ERROR'
        : 'UPLOAD_ERROR';
  const message = known
    ? error.message
    : databaseUnavailable
      ? 'The case database is temporarily unavailable. Please try again shortly.'
    : error.code === 'LIMIT_FILE_SIZE'
      ? 'Each upload must be 5 MB or smaller.'
      : status === 500
        ? 'Something went wrong. Please try again.'
        : error.message;
  res.status(status).json({
    success: false,
    error: { code, message, ...(known && error.details ? { details: error.details } : {}) },
  });
}
