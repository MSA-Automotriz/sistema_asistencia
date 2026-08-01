import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('MSA Asistencia API'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  LOG_LEVEL: z.string().default('info'),
  QR_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(60),
  GPS_RADIUS_METERS: z.coerce.number().positive().default(10),
  CORS_ORIGIN: z.string().default('*')
});

export const env = schema.parse(process.env);