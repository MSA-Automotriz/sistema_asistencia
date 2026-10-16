import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AppError } from '../common/errors/app-error.js';

const ticketsDir = path.resolve(process.cwd(), 'public', 'uploads', 'tickets');
const requestsDir = path.resolve(process.cwd(), 'public', 'uploads', 'requests');

if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir, { recursive: true });
if (!fs.existsSync(requestsDir)) fs.mkdirSync(requestsDir, { recursive: true });

function generateFilename(prefix: string, originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}-${Date.now()}-${random}${ext}`;
}

export const ticketEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ticketsDir),
    filename: (_req, file, cb) => cb(null, generateFilename('ticket', file.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(
        new AppError(
          400,
          'Solo se permiten imágenes (JPG, PNG, WEBP, GIF) de hasta 5MB como evidencia del ticket.'
        )
      );
    }
    cb(null, true);
  }
});

export const requestDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, requestsDir),
    filename: (_req, file, cb) => cb(null, generateFilename('request', file.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf'
    ];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(
        new AppError(
          400,
          'Solo se permiten documentos PDF o imágenes (JPG, PNG, WEBP) de hasta 5MB como sustento.'
        )
      );
    }
    cb(null, true);
  }
});
