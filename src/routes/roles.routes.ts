import { Router } from 'express';
import { z } from 'zod';
import { AccessControlService } from '../use-cases/access-control/access-control-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';

const accessControl = new AccessControlService();

const permissionsSchema = z.object({
  body: z.object({ permissionIds: z.array(z.string().min(1)).max(100) }).strict()
});

export const rolesRouter = Router();

rolesRouter.get('/roles/:id/permissions', authorize('roles.read'), async (request, response) =>
  ok(
    response,
    'Permisos del rol obtenidos correctamente',
    await accessControl.rolePermissions(String(request.params.id))
  )
);

rolesRouter.put(
  '/roles/:id/permissions',
  authorize('roles.update'),
  validate(permissionsSchema),
  async (request, response) =>
    ok(
      response,
      'Permisos del rol actualizados correctamente',
      await accessControl.replaceRolePermissions(
        String(request.params.id),
        request.body.permissionIds
      )
    )
);
