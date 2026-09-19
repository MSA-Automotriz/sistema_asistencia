import { Router } from 'express';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';
import { UserManagementService } from '../use-cases/users/user-management-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { AppError } from '../common/errors/app-error.js';

const users = new UserManagementService();

const createUserSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional().or(z.literal('')),
      idUsuario: z.string().trim().min(3).max(50).optional(),
      password: z.string().min(8).max(128),
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      roleId: z.string().min(1),
      status: z.nativeEnum(UserStatus).optional(),
      siteId: z.string().trim().optional().or(z.literal('')).nullable(),
      birthDate: z.coerce.date().nullable().optional()
    })
    .strict()
});

const updateUserSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional().or(z.literal('')),
      idUsuario: z.string().trim().min(3).max(50).optional().or(z.literal('')),
      password: z.string().min(8).max(128).optional().or(z.literal('')),
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      roleId: z.string().min(1).optional(),
      siteId: z.string().trim().optional().or(z.literal('')).nullable(),
      birthDate: z.coerce.date().nullable().optional()
    })
    .strict()
    .refine(
      (data) => Object.values(data).some((value) => value !== undefined),
      'Debe indicar al menos un campo para actualizar'
    )
});

const userStatusSchema = z.object({
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']) }).strict()
});

const passwordSchema = z.object({
  body: z.object({ newPassword: z.string().min(12).max(128) }).strict()
});

const roleSchema = z.object({
  body: z.object({ roleId: z.string().min(1) }).strict()
});

const permissionsSchema = z.object({
  body: z.object({ permissionIds: z.array(z.string().min(1)).max(100) }).strict()
});

export const usersRouter = Router();

usersRouter.get('/users', authorize('users.read'), async (request, response) => {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  return ok(response, 'Usuarios obtenidos correctamente', await users.list(page, limit));
});

usersRouter.post(
  '/users',
  authorize('users.create'),
  validate(createUserSchema),
  async (request, response) =>
    ok(response, 'Usuario registrado correctamente', await users.create(request.body), 201)
);

usersRouter.get('/users/export/pdf', authorize('users.read'), async (_request, response) => {
  const exported = await users.exportPdf();
  response.setHeader('content-type', exported.contentType);
  response.setHeader('content-disposition', `attachment; filename="${exported.filename}"`);
  return response.status(200).send(exported.content);
});

usersRouter.get('/users/:id', authorize('users.read'), async (request, response) =>
  ok(response, 'Usuario obtenido correctamente', await users.get(String(request.params.id)))
);

usersRouter.put(
  '/users/:id',
  authorize('users.update'),
  validate(updateUserSchema),
  async (request, response) =>
    ok(
      response,
      'Usuario actualizado correctamente',
      await users.update(String(request.params.id), request.body)
    )
);

usersRouter.patch(
  '/users/:id',
  authorize('users.update'),
  validate(updateUserSchema),
  async (request, response) =>
    ok(
      response,
      'Usuario actualizado correctamente',
      await users.update(String(request.params.id), request.body)
    )
);

usersRouter.put(
  '/users/:id/status',
  authorize('users.update'),
  validate(userStatusSchema),
  async (request, response) => {
    if (request.auth!.sub === String(request.params.id) && request.body.status !== 'ACTIVE')
      throw new AppError(400, 'No puede desactivar su propia cuenta');
    return ok(
      response,
      'Estado del usuario actualizado correctamente',
      await users.setStatus(String(request.params.id), request.body.status)
    );
  }
);

usersRouter.post(
  '/users/:id/reset-password',
  authorize('users.update'),
  validate(passwordSchema),
  async (request, response) => {
    await users.resetPassword(String(request.params.id), request.body.newPassword);
    return ok(response, 'Contraseña restablecida; las sesiones fueron revocadas');
  }
);

usersRouter.put(
  '/users/:id/role',
  authorize('users.update'),
  validate(roleSchema),
  async (request, response) =>
    ok(
      response,
      'Rol asignado correctamente',
      await users.assignRole(String(request.params.id), request.body.roleId)
    )
);

usersRouter.put(
  '/users/:id/permissions',
  authorize('users.update'),
  validate(permissionsSchema),
  async (request, response) =>
    ok(
      response,
      'Permisos del usuario actualizados correctamente',
      await users.replacePermissions(String(request.params.id), request.body.permissionIds)
    )
);

usersRouter.delete('/users/:id', authorize('users.delete'), async (request, response) => {
  if (request.auth!.sub === String(request.params.id))
    throw new AppError(400, 'No puede eliminar su propia cuenta');
  await users.remove(String(request.params.id));
  return response.status(204).send();
});
