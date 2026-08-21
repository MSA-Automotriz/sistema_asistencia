import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
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
app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: env.CORS_ORIGIN !== '*'
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const candidatePublicDirs = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd()),
    path.resolve(currentDir, '..', 'public'),
    path.resolve(currentDir, '..'),
    path.resolve(currentDir, 'public')
];
const publicDir = candidatePublicDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ||
    candidatePublicDirs.find((dir) => fs.existsSync(dir)) ||
    candidatePublicDirs[0];
const candidateLeafletDirs = [
    path.resolve(process.cwd(), 'node_modules', 'leaflet', 'dist'),
    path.resolve(currentDir, '..', 'node_modules', 'leaflet', 'dist'),
    path.resolve(publicDir, 'vendor', 'leaflet'),
    path.resolve(process.cwd(), 'vendor', 'leaflet')
];
const leafletDir = candidateLeafletDirs.find((dir) => fs.existsSync(dir)) || candidateLeafletDirs[0];
app.use('/vendor/leaflet', express.static(leafletDir));
app.use(express.static(publicDir));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false
}));
app.use('/api/v1', apiRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use((req, res, next) => {
    if (req.method !== 'GET')
        return next();
    if (req.path.startsWith('/api'))
        return next();
    res.sendFile(path.join(publicDir, 'index.html'));
});
app.use(errorHandler);
//# sourceMappingURL=app.js.map