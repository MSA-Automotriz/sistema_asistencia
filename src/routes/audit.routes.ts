import { Router } from 'express';
import { z } from 'zod';
import { AuditService } from '../use-cases/audit/audit-service.js';
import { authorize } from '../middleware/auth.js';
import { ok } from '../common/http/response.js';

const audit = new AuditService();

export const auditRouter = Router();

auditRouter.get('/audit-logs', authorize('audit-logs.read'), async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      entity: z.string().trim().min(1).max(100).optional(),
      userId: z.string().min(1).optional()
    })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Auditoría obtenida correctamente',
    await audit.list(query.page, query.limit, query.entity, query.userId)
  );
});
