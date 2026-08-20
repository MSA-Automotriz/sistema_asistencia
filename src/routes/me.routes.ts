import { Router } from 'express';
import { z } from 'zod';
import { AttendanceType } from '@prisma/client';
import { EmployeeSelfService } from '../use-cases/employees/employee-self-service.js';
import { NotificationService } from '../use-cases/notifications/notification-service.js';
import { AnnouncementService } from '../use-cases/announcements/announcement-service.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';

const selfService = new EmployeeSelfService();
const notifications = new NotificationService();
const announcements = new AnnouncementService();

const profileSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      profilePhotoUrl: z.string().url().max(500).nullable().optional()
    })
    .strict()
    .refine(
      (input) => Object.values(input).some((value) => value !== undefined),
      'Debe indicar un campo para actualizar'
    )
});

const deviceRegistrationSchema = z.object({
  body: z
    .object({
      fingerprint: z.string().trim().min(8).max(191),
      name: z.string().trim().max(191).optional()
    })
    .strict()
});

const attendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    type: z.nativeEnum(AttendanceType).optional(),
    status: z.enum(['ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'OUTSIDE_GEOFENCE']).optional()
  })
  .strict();

export const meRouter = Router();

meRouter.get('/me/profile', async (request, response) =>
  ok(response, 'Perfil obtenido correctamente', await selfService.getProfile(request.auth!.sub))
);

meRouter.patch('/me/profile', validate(profileSchema), async (request, response) => {
  const profile = await selfService.updateProfile(request.auth!.sub, request.body);
  auditEvent(request, 'UPDATE', 'OwnProfile', profile.id);
  return ok(response, 'Perfil actualizado correctamente', profile);
});

meRouter.get('/me/attendance', async (request, response) => {
  const query = attendanceQuerySchema.parse(request.query);
  return ok(
    response,
    'Historial de asistencia obtenido correctamente',
    await selfService.attendanceHistory(request.auth!.sub, query)
  );
});

meRouter.get('/me/last-attendance', async (request, response) =>
  ok(
    response,
    'Último registro de asistencia obtenido correctamente',
    await selfService.getLastAttendance(request.auth!.sub)
  )
);

meRouter.get('/me/requests', async (request, response) =>
  ok(
    response,
    'Historial de solicitudes obtenido correctamente',
    await selfService.requestHistory(request.auth!.sub)
  )
);

meRouter.get('/me/request-summary', async (request, response) =>
  ok(
    response,
    'Resumen de solicitudes obtenido correctamente',
    await selfService.requestStatusSummary(request.auth!.sub)
  )
);

meRouter.get('/me/notifications', async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      unreadOnly: z.enum(['true', 'false']).optional().default('false')
    })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Notificaciones obtenidas correctamente',
    await notifications.listForUser(
      request.auth!.sub,
      query.page,
      query.limit,
      query.unreadOnly === 'true'
    )
  );
});

meRouter.patch('/me/notifications/:id/read', async (request, response) => {
  await notifications.markRead(request.auth!.sub, String(request.params.id));
  return ok(response, 'Notificación marcada como leída');
});

meRouter.patch('/me/notifications/read', async (request, response) => {
  await notifications.markAllRead(request.auth!.sub);
  return ok(response, 'Notificaciones marcadas como leídas');
});

meRouter.get('/me/announcements', async (request, response) =>
  ok(
    response,
    'Anuncios obtenidos correctamente',
    await announcements.listForUser(request.auth!.sub)
  )
);

meRouter.get('/me/devices', async (request, response) =>
  ok(
    response,
    'Dispositivos obtenidos correctamente',
    await selfService.listDevices(request.auth!.sub)
  )
);

meRouter.post('/me/devices', validate(deviceRegistrationSchema), async (request, response) => {
  const device = await selfService.registerDevice(request.auth!.sub, {
    ...request.body,
    userAgent: request.header('user-agent'),
    ipAddress: request.ip
  });
  auditEvent(request, 'REGISTER', 'Device', device.id);
  return ok(response, 'Dispositivo registrado correctamente', device, 201);
});

meRouter.delete('/me/devices/:id', async (request, response) => {
  await selfService.removeOwnDevice(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'DELETE', 'Device', String(request.params.id));
  return response.status(204).send();
});
