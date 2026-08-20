import type { Request, Router } from 'express';
import multer from 'multer';
import { AuditService } from '../use-cases/audit/audit-service.js';
import { CrudController } from '../controllers/crud-controller.js';
import { authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const audit = new AuditService();

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

export const meta = (request: Request) => ({
  ip: request.ip,
  userAgent: request.header('user-agent')
});

export const auditEvent = (request: Request, action: string, entity: string, entityId?: string) => {
  void audit
    .record({
      userId: request.auth?.sub,
      action,
      entity,
      entityId,
      ipAddress: request.ip,
      device: request.header('user-agent')
    })
    .catch((error: unknown) =>
      logger.warn('No se pudo registrar la auditoría', {
        action,
        entity,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    );
};

export type CrudDelegate = unknown;

export const mountCrud = (
  router: Router,
  path: string,
  label: string,
  delegate: CrudDelegate,
  resource: string
) => {
  const controller = new CrudController(delegate, label);
  router.get(path, authorize(`${resource}.read`), controller.list);
  router.get(`${path}/:id`, authorize(`${resource}.read`), controller.get);
  router.post(path, authorize(`${resource}.create`), controller.create);
  router.put(`${path}/:id`, authorize(`${resource}.update`), controller.update);
  router.patch(`${path}/:id`, authorize(`${resource}.update`), controller.update);
  router.delete(`${path}/:id`, authorize(`${resource}.delete`), controller.remove);
};
