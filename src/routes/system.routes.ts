import { Router } from 'express';
import { z } from 'zod';
import { SystemService } from '../use-cases/system/system-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';

const system = new SystemService();

const cleanupSchema = z.object({
  body: z.object({ retentionDays: z.number().int().min(7).max(3_650).default(90) }).strict()
});

export const systemRouter = Router();

systemRouter.get('/system/status', authorize('maintenance.read'), async (_request, response) =>
  ok(response, 'Estado del sistema obtenido correctamente', await system.status())
);

systemRouter.get('/system/logs', authorize('system-logs.read'), async (request, response) => {
  const query = z
    .object({
      kind: z.enum(['error', 'combined']).default('combined'),
      limit: z.coerce.number().int().min(1).max(500).default(100)
    })
    .strict()
    .parse(request.query);
  return ok(response, 'Logs obtenidos correctamente', await system.logs(query.kind, query.limit));
});

systemRouter.post(
  '/system/cleanup',
  authorize('maintenance.update'),
  validate(cleanupSchema),
  async (request, response) => {
    const result = await system.cleanExpiredData(request.body.retentionDays);
    auditEvent(request, 'CLEANUP', 'System');
    return ok(response, 'Limpieza de datos completada correctamente', result);
  }
);

systemRouter.post('/system/analyze', authorize('maintenance.update'), async (request, response) => {
  const result = await system.analyzeDatabase();
  auditEvent(request, 'ANALYZE', 'System');
  return ok(response, 'Análisis de base de datos completado correctamente', result);
});
