import compression from 'compression';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { apiRouter } from './routes/api.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';
import { swaggerSpec } from './docs/swagger.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: env.CORS_ORIGIN !== '*'
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const rootDir = process.cwd();
const publicDir = path.resolve(rootDir, 'public');

app.use(
  '/vendor/leaflet',
  express.static(path.resolve(rootDir, 'node_modules', 'leaflet', 'dist'))
);
app.use(express.static(publicDir));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  })
);
app.use('/api/v1', apiRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.use(errorHandler);
