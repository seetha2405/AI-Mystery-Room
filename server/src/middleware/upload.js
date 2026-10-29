import multer from 'multer';
import { AppError } from '../utils/AppError.js';
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'text/plain']);
export const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    allowed.has(file.mimetype)
      ? cb(null, true)
      : cb(new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Use PNG, JPG, WEBP, or TXT files.')),
}).array('files', 3);
export function hasValidSignature(file) {
  const b = file.buffer;
  if (file.mimetype === 'text/plain') return !b.includes(0);
  if (file.mimetype === 'image/png')
    return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === 'image/webp')
    return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  return false;
}
