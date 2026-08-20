import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Cargar variables desde .env o config.env (para paneles que restringen archivos con punto)
['.env', 'config.env', 'app.env'].forEach((fileName) => {
  const filePath = path.resolve(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
  }
});

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('MSA Asistencia API'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  JWT_REMEMBER_ME_EXPIRES_IN: z.string().default('90d'),
  LOG_LEVEL: z.string().default('info'),
  OFFLINE_ATTENDANCE_EXPIRATION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  GPS_RADIUS_METERS: z.coerce.number().positive().default(10),
  CORS_ORIGIN: z.string().default('*'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().optional(),
  BACKUP_DIRECTORY: z.string().min(1).default('logs/backups'),
  MYSQLDUMP_PATH: z.string().min(1).optional()
});

export const env = schema.parse(process.env);
