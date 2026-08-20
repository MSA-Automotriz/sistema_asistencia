import { Router } from 'express';
import { z } from 'zod';
import { RequestService } from '../use-cases/requests/request-service.js';
import { LeaveService } from '../use-cases/leaves/leave-service.js';
import { NotificationService } from '../use-cases/notifications/notification-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';

const requests = new RequestService();
const leaves = new LeaveService();
const notifications = new NotificationService();

const workPermissionSchema = z.object({
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: z.string().trim().min(3).max(1_000)
    })
    .strict()
});

const overtimeRequestSchema = z.object({
  body: z
    .object({
      date: z.coerce.date(),
      requestedMinutes: z.number().int().min(1).max(720),
      reason: z.string().trim().min(3).max(1_000)
    })
    .strict()
});

const reviewRequestSchema = z.object({
  body: z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).strict()
});

const leavePeriodSchema = z.object({
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: z.string().trim().max(1_000).optional()
    })
    .strict()
});

const licenseSchema = z.object({
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      type: z.string().trim().min(3).max(100),
      reason: z.string().trim().max(1_000).optional()
    })
    .strict()
});

const leaveReviewSchema = z.object({
  body: z
    .object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reviewNote: z.string().trim().max(1_000).optional()
    })
    .strict()
});

const requestListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict();

export const requestsRouter = Router();

// Permisos de trabajo (solicitud por empleado)
requestsRouter.post(
  '/requests/work-permissions',
  validate(workPermissionSchema),
  async (request, response) =>
    ok(
      response,
      'Solicitud de permiso enviada correctamente',
      await requests.createWorkPermission(request.auth!.sub, request.body),
      201
    )
);

requestsRouter.get('/requests/work-permissions', async (request, response) =>
  ok(
    response,
    'Solicitudes de permiso obtenidas correctamente',
    await requests.listOwnWorkPermissions(request.auth!.sub)
  )
);

requestsRouter.delete('/requests/work-permissions/:id', async (request, response) =>
  ok(
    response,
    'Solicitud de permiso cancelada correctamente',
    await requests.cancelWorkPermission(request.auth!.sub, String(request.params.id))
  )
);

requestsRouter.patch(
  '/work-permissions/:id/review',
  authorize('work-permissions.update'),
  validate(reviewRequestSchema),
  async (request, response) =>
    ok(
      response,
      'Solicitud de permiso revisada correctamente',
      await requests.reviewWorkPermission(
        String(request.params.id),
        request.body.status,
        request.auth!.sub
      )
    )
);

// Horas extra
requestsRouter.post(
  '/requests/overtime',
  validate(overtimeRequestSchema),
  async (request, response) =>
    ok(
      response,
      'Solicitud de horas extra enviada correctamente',
      await requests.createOvertimeRequest(request.auth!.sub, request.body),
      201
    )
);

requestsRouter.get('/requests/overtime', async (request, response) =>
  ok(
    response,
    'Solicitudes de horas extra obtenidas correctamente',
    await requests.listOwnOvertimeRequests(request.auth!.sub)
  )
);

requestsRouter.delete('/requests/overtime/:id', async (request, response) =>
  ok(
    response,
    'Solicitud de horas extra cancelada correctamente',
    await requests.cancelOvertimeRequest(request.auth!.sub, String(request.params.id))
  )
);

requestsRouter.patch(
  '/overtime-requests/:id/review',
  authorize('overtime-requests.update'),
  validate(reviewRequestSchema),
  async (request, response) =>
    ok(
      response,
      'Solicitud de horas extra revisada correctamente',
      await requests.reviewOvertimeRequest(
        String(request.params.id),
        request.body.status,
        request.auth!.sub
      )
    )
);

// Administración de solicitudes
requestsRouter.get(
  '/requests/admin/work-permissions',
  authorize('work-permissions.read'),
  async (request, response) => {
    const query = requestListQuerySchema.parse(request.query);
    return ok(
      response,
      'Solicitudes de permiso obtenidas correctamente',
      await requests.listWorkPermissions(query.page, query.limit)
    );
  }
);

requestsRouter.get(
  '/requests/admin/overtime',
  authorize('overtime-requests.read'),
  async (request, response) => {
    const query = requestListQuerySchema.parse(request.query);
    return ok(
      response,
      'Solicitudes de horas extra obtenidas correctamente',
      await requests.listOvertimeRequests(query.page, query.limit)
    );
  }
);

requestsRouter.get(
  '/requests/admin/vacations',
  authorize('vacations.read'),
  async (request, response) => {
    const query = requestListQuerySchema.parse(request.query);
    return ok(
      response,
      'Solicitudes de vacaciones obtenidas correctamente',
      await leaves.listVacations(query.page, query.limit)
    );
  }
);

requestsRouter.get(
  '/requests/admin/licenses',
  authorize('licenses.read'),
  async (request, response) => {
    const query = requestListQuerySchema.parse(request.query);
    return ok(
      response,
      'Solicitudes de licencia obtenidas correctamente',
      await leaves.listLicenses(query.page, query.limit)
    );
  }
);

// Vacaciones
requestsRouter.post(
  '/requests/vacations',
  validate(leavePeriodSchema),
  async (request, response) => {
    const vacation = await leaves.createVacation(request.auth!.sub, request.body);
    auditEvent(request, 'CREATE', 'Vacation', vacation.id);
    return ok(response, 'Solicitud de vacaciones enviada correctamente', vacation, 201);
  }
);

requestsRouter.get('/requests/vacations', async (request, response) =>
  ok(
    response,
    'Solicitudes de vacaciones obtenidas correctamente',
    await leaves.listOwnVacations(request.auth!.sub)
  )
);

requestsRouter.delete('/requests/vacations/:id', async (request, response) => {
  const vacation = await leaves.cancelVacation(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'CANCEL', 'Vacation', vacation.id);
  return ok(response, 'Solicitud de vacaciones cancelada correctamente', vacation);
});

requestsRouter.patch(
  '/vacations/:id/review',
  authorize('vacations.update'),
  validate(leaveReviewSchema),
  async (request, response) => {
    const vacation = await leaves.reviewVacation(
      String(request.params.id),
      request.auth!.sub,
      request.body
    );
    await notifications.create({
      userId: vacation.employee.user.id,
      title: 'Solicitud de vacaciones revisada',
      body: `Su solicitud fue ${request.body.status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
      type: 'VACATION_REVIEW'
    });
    auditEvent(request, 'REVIEW', 'Vacation', vacation.id);
    return ok(response, 'Solicitud de vacaciones revisada correctamente', vacation);
  }
);

// Licencias
requestsRouter.post('/requests/licenses', validate(licenseSchema), async (request, response) => {
  const license = await leaves.createLicense(request.auth!.sub, request.body);
  auditEvent(request, 'CREATE', 'License', license.id);
  return ok(response, 'Solicitud de licencia enviada correctamente', license, 201);
});

requestsRouter.get('/requests/licenses', async (request, response) =>
  ok(
    response,
    'Solicitudes de licencia obtenidas correctamente',
    await leaves.listOwnLicenses(request.auth!.sub)
  )
);

requestsRouter.delete('/requests/licenses/:id', async (request, response) => {
  const license = await leaves.cancelLicense(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'CANCEL', 'License', license.id);
  return ok(response, 'Solicitud de licencia cancelada correctamente', license);
});

requestsRouter.patch(
  '/licenses/:id/review',
  authorize('licenses.update'),
  validate(leaveReviewSchema),
  async (request, response) => {
    const license = await leaves.reviewLicense(
      String(request.params.id),
      request.auth!.sub,
      request.body
    );
    await notifications.create({
      userId: license.employee.user.id,
      title: 'Solicitud de licencia revisada',
      body: `Su solicitud fue ${request.body.status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
      type: 'LICENSE_REVIEW'
    });
    auditEvent(request, 'REVIEW', 'License', license.id);
    return ok(response, 'Solicitud de licencia revisada correctamente', license);
  }
);
