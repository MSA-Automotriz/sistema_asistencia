import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CrudController } from '../controllers/crud-controller.js';
import { AuthService } from '../use-cases/auth/auth-service.js';
import { RegisterAttendance } from '../use-cases/attendance/register-attendance.js';
import { AppError } from '../common/errors/app-error.js';
import { ok } from '../common/http/response.js';
import { AnnouncementStatus, AttendanceType, BackupType, DeviceStatus } from '@prisma/client';
import { AccessControlService } from '../use-cases/access-control/access-control-service.js';
import { DashboardService } from '../use-cases/dashboard/dashboard-service.js';
import { RequestService } from '../use-cases/requests/request-service.js';
import { UserManagementService } from '../use-cases/users/user-management-service.js';
import { LeaveService } from '../use-cases/leaves/leave-service.js';
import { NotificationService } from '../use-cases/notifications/notification-service.js';
import { AuditService } from '../use-cases/audit/audit-service.js';
import { EmployeeSelfService } from '../use-cases/employees/employee-self-service.js';
import { EmployeeAdministrationService } from '../use-cases/employees/employee-administration-service.js';
import { AttendanceOperationsService } from '../use-cases/attendance/attendance-operations-service.js';
import { ReportService, reportTypes } from '../use-cases/reports/report-service.js';
import { AnnouncementService } from '../use-cases/announcements/announcement-service.js';
import { DeviceService } from '../use-cases/devices/device-service.js';
import { SystemService } from '../use-cases/system/system-service.js';
import { BackupService } from '../use-cases/backups/backup-service.js';
import { logger } from '../utils/logger.js';

const auth = new AuthService();
const attendance = new RegisterAttendance();
const accessControl = new AccessControlService();
const dashboard = new DashboardService();
const requests = new RequestService();
const users = new UserManagementService();
const leaves = new LeaveService();
const notifications = new NotificationService();
const audit = new AuditService();
const selfService = new EmployeeSelfService();
const employees = new EmployeeAdministrationService();
const attendanceOperations = new AttendanceOperationsService();
const reports = new ReportService();
const announcements = new AnnouncementService();
const devices = new DeviceService();
const system = new SystemService();
const backups = new BackupService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});
const meta = (request: Request) => ({ ip: request.ip, userAgent: request.header('user-agent') });
const auditEvent = (request: Request, action: string, entity: string, entityId?: string) => {
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
const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      rememberMe: z.boolean().optional().default(false)
    })
    .strict()
});
const refreshSchema = z.object({ body: z.object({ refreshToken: z.string().min(40) }) });
const recoveryQuestionsSchema = z.object({
  body: z
    .object({
      questions: z
        .array(
          z
            .object({
              question: z.string().trim().min(3).max(200),
              answer: z.string().trim().min(1).max(200)
            })
            .strict()
        )
        .min(2)
        .max(5)
    })
    .strict()
});
const startPasswordRecoverySchema = z.object({
  body: z.object({ email: z.string().email() }).strict()
});
const resetPasswordRecoverySchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      recoveryToken: z.string().min(40),
      answers: z
        .array(
          z
            .object({ questionId: z.string().min(1), answer: z.string().trim().min(1).max(200) })
            .strict()
        )
        .min(2)
        .max(5),
      newPassword: z.string().min(12).max(128)
    })
    .strict()
});
const createUserSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(12).max(128),
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      roleId: z.string().min(1),
      status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional()
    })
    .strict()
});
const updateUserSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      roleId: z.string().min(1).optional()
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
const roleSchema = z.object({ body: z.object({ roleId: z.string().min(1) }).strict() });
const permissionsSchema = z.object({
  body: z.object({ permissionIds: z.array(z.string().min(1)).max(100) }).strict()
});
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
const attendanceSchema = z.object({
  body: z.object({
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    type: z.nativeEnum(AttendanceType),
    approximateAddress: z.string().max(300).optional(),
    connectionType: z.string().max(80).optional(),
    deviceFingerprint: z.string().trim().min(8).max(191).optional()
  })
});
const offlineAttendanceSchema = z.object({
  body: z
    .object({
      offlineToken: z.string().min(20),
      latitude: z.number().gte(-90).lte(90),
      longitude: z.number().gte(-180).lte(180),
      type: z.nativeEnum(AttendanceType),
      recordedAt: z.coerce.date(),
      approximateAddress: z.string().max(300).optional(),
      connectionType: z.string().max(80).optional(),
      deviceFingerprint: z.string().trim().min(8).max(191).optional()
    })
    .strict()
});
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
const deviceStatusSchema = z.object({
  body: z.object({ status: z.nativeEnum(DeviceStatus) }).strict()
});
const announcementSchema = z.object({
  body: z
    .object({
      companyId: z.string().min(1),
      title: z.string().trim().min(3).max(191),
      body: z.string().trim().min(3).max(5_000),
      audienceRoleId: z.string().min(1).nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional()
    })
    .strict()
});
const backupSchema = z.object({
  body: z.object({ companyId: z.string().min(1), type: z.nativeEnum(BackupType) }).strict()
});
const restoreSchema = z.object({ body: z.object({ confirmation: z.literal('RESTORE') }).strict() });
const backupScheduleSchema = z.object({
  body: z
    .object({
      companyId: z.string().min(1),
      enabled: z.boolean(),
      frequency: z.enum(['DAILY', 'WEEKLY']),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
      dayOfWeek: z.number().int().min(0).max(6).optional().default(1),
      type: z.nativeEnum(BackupType)
    })
    .strict()
});
const cleanupSchema = z.object({
  body: z.object({ retentionDays: z.number().int().min(7).max(3_650).default(90) }).strict()
});
const companySettingsSchema = z.object({
  body: z
    .object({
      settings: z
        .array(
          z
            .object({ key: z.string().trim().min(1).max(191), value: z.string().max(10_000) })
            .strict()
        )
        .min(1)
        .max(100)
    })
    .strict()
});
const companyIdentitySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(191).optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().trim().max(100).nullable().optional(),
      address: z.string().trim().max(500).nullable().optional(),
      timeZone: z.string().trim().min(1).max(100).optional(),
      logoUrl: z.string().url().max(500).nullable().optional()
    })
    .strict()
    .refine(
      (input) => Object.values(input).some((value) => value !== undefined),
      'Debe indicar un campo para actualizar'
    )
});
const employeeProvisionSchema = z.object({
  body: z
    .object({
      userId: z.string().min(1),
      companyId: z.string().min(1),
      employeeCode: z.string().trim().min(1).max(100),
      siteId: z.string().min(1).nullable().optional(),
      departmentId: z.string().min(1).nullable().optional(),
      positionId: z.string().min(1).nullable().optional(),
      scheduleId: z.string().min(1).nullable().optional(),
      supervisorId: z.string().min(1).nullable().optional(),
      profilePhotoUrl: z.string().url().max(500).nullable().optional(),
      hiredAt: z.coerce.date(),
      active: z.boolean().optional()
    })
    .strict()
});
const employeeUpdateSchema = z.object({
  body: employeeProvisionSchema.shape.body
    .omit({ userId: true })
    .partial()
    .strict()
    .refine(
      (input) => Object.values(input).some((value) => value !== undefined),
      'Debe indicar un campo para actualizar'
    )
});
const attendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    employeeId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    type: z.nativeEnum(AttendanceType).optional(),
    status: z.enum(['ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'OUTSIDE_GEOFENCE']).optional(),
    search: z.string().trim().min(1).max(100).optional()
  })
  .strict();
const statisticsQuerySchema = attendanceQuerySchema.omit({
  page: true,
  limit: true,
  type: true,
  status: true,
  search: true
});
const calendarQuerySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    companyId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    employeeId: z.string().min(1).optional()
  })
  .strict();
const reportQuerySchema = z
  .object({
    format: z.enum(['CSV', 'XLSX', 'PDF']).default('CSV'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    companyId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    employeeId: z.string().min(1).optional()
  })
  .strict();
type CrudDelegate = unknown;

const mountCrud = (
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

export const apiRouter = Router();
apiRouter.get('/health', (_request, response) =>
  ok(response, 'Servicio disponible', { status: 'healthy' })
);

apiRouter.post('/auth/login', validate(loginSchema), async (request, response) =>
  ok(
    response,
    'Inicio de sesión correcto',
    await auth.login(
      request.body.email,
      request.body.password,
      meta(request),
      request.body.rememberMe
    )
  )
);
apiRouter.post('/auth/refresh', validate(refreshSchema), async (request, response) =>
  ok(
    response,
    'Token renovado correctamente',
    await auth.refresh(request.body.refreshToken, meta(request))
  )
);
apiRouter.post('/auth/logout', validate(refreshSchema), async (request, response) => {
  await auth.logout(request.body.refreshToken);
  return ok(response, 'Sesión cerrada correctamente');
});
apiRouter.post(
  '/auth/change-password',
  authenticate,
  validate(
    z.object({
      body: z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(12) })
    })
  ),
  async (request, response) => {
    await auth.changePassword(
      request.auth!.sub,
      request.body.currentPassword,
      request.body.newPassword
    );
    return ok(response, 'Contraseña actualizada; las sesiones fueron revocadas');
  }
);
apiRouter.get('/auth/recovery-questions', authenticate, async (request, response) =>
  ok(
    response,
    'Preguntas de recuperación obtenidas',
    await auth.getRecoveryQuestions(request.auth!.sub)
  )
);
apiRouter.post(
  '/auth/recovery-questions',
  authenticate,
  validate(recoveryQuestionsSchema),
  async (request, response) => {
    await auth.setRecoveryQuestions(request.auth!.sub, request.body.questions);
    return ok(response, 'Preguntas de recuperación actualizadas correctamente');
  }
);
apiRouter.post(
  '/auth/password-recovery/start',
  validate(startPasswordRecoverySchema),
  async (request, response) =>
    ok(
      response,
      'Si la cuenta cumple los requisitos, se iniciará su recuperación',
      await auth.startPasswordRecovery(request.body.email)
    )
);
apiRouter.post(
  '/auth/password-recovery/reset',
  validate(resetPasswordRecoverySchema),
  async (request, response) => {
    await auth.resetPasswordWithRecovery(
      request.body.email,
      request.body.recoveryToken,
      request.body.answers,
      request.body.newPassword
    );
    return ok(response, 'Contraseña restablecida correctamente');
  }
);
apiRouter.get('/auth/sessions', authenticate, async (request, response) =>
  ok(
    response,
    'Sesiones activas obtenidas',
    (await auth.activeSessions(request.auth!.sub)).map((session) => ({
      ...session,
      current: session.id === request.auth!.sid
    }))
  )
);
apiRouter.delete('/auth/sessions/:sessionId', authenticate, async (request, response) => {
  await auth.revokeSession(request.auth!.sub, String(request.params.sessionId));
  return response.status(204).send();
});
apiRouter.delete('/auth/sessions', authenticate, async (request, response) => {
  await auth.revokeAll(request.auth!.sub);
  return response.status(204).send();
});

apiRouter.use(authenticate);
apiRouter.get('/users', authorize('users.read'), async (request, response) => {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  return ok(response, 'Usuarios obtenidos correctamente', await users.list(page, limit));
});
apiRouter.post(
  '/users',
  authorize('users.create'),
  validate(createUserSchema),
  async (request, response) =>
    ok(response, 'Usuario registrado correctamente', await users.create(request.body), 201)
);
apiRouter.get('/users/:id', authorize('users.read'), async (request, response) =>
  ok(response, 'Usuario obtenido correctamente', await users.get(String(request.params.id)))
);
apiRouter.put(
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
apiRouter.patch(
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
apiRouter.put(
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
apiRouter.post(
  '/users/:id/reset-password',
  authorize('users.update'),
  validate(passwordSchema),
  async (request, response) => {
    await users.resetPassword(String(request.params.id), request.body.newPassword);
    return ok(response, 'Contraseña restablecida; las sesiones fueron revocadas');
  }
);
apiRouter.put(
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
apiRouter.put(
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
apiRouter.delete('/users/:id', authorize('users.delete'), async (request, response) => {
  if (request.auth!.sub === String(request.params.id))
    throw new AppError(400, 'No puede eliminar su propia cuenta');
  await users.remove(String(request.params.id));
  return response.status(204).send();
});

apiRouter.get('/roles/:id/permissions', authorize('roles.read'), async (request, response) =>
  ok(
    response,
    'Permisos del rol obtenidos correctamente',
    await accessControl.rolePermissions(String(request.params.id))
  )
);
apiRouter.put(
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

apiRouter.post(
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
apiRouter.get('/requests/work-permissions', async (request, response) =>
  ok(
    response,
    'Solicitudes de permiso obtenidas correctamente',
    await requests.listOwnWorkPermissions(request.auth!.sub)
  )
);
apiRouter.delete('/requests/work-permissions/:id', async (request, response) =>
  ok(
    response,
    'Solicitud de permiso cancelada correctamente',
    await requests.cancelWorkPermission(request.auth!.sub, String(request.params.id))
  )
);
apiRouter.patch(
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
apiRouter.post('/requests/overtime', validate(overtimeRequestSchema), async (request, response) =>
  ok(
    response,
    'Solicitud de horas extra enviada correctamente',
    await requests.createOvertimeRequest(request.auth!.sub, request.body),
    201
  )
);
apiRouter.get('/requests/overtime', async (request, response) =>
  ok(
    response,
    'Solicitudes de horas extra obtenidas correctamente',
    await requests.listOwnOvertimeRequests(request.auth!.sub)
  )
);
apiRouter.delete('/requests/overtime/:id', async (request, response) =>
  ok(
    response,
    'Solicitud de horas extra cancelada correctamente',
    await requests.cancelOvertimeRequest(request.auth!.sub, String(request.params.id))
  )
);
apiRouter.patch(
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

const requestListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict();
apiRouter.get(
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
apiRouter.get(
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
apiRouter.get(
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
apiRouter.get('/requests/admin/licenses', authorize('licenses.read'), async (request, response) => {
  const query = requestListQuerySchema.parse(request.query);
  return ok(
    response,
    'Solicitudes de licencia obtenidas correctamente',
    await leaves.listLicenses(query.page, query.limit)
  );
});

apiRouter.post('/requests/vacations', validate(leavePeriodSchema), async (request, response) => {
  const vacation = await leaves.createVacation(request.auth!.sub, request.body);
  auditEvent(request, 'CREATE', 'Vacation', vacation.id);
  return ok(response, 'Solicitud de vacaciones enviada correctamente', vacation, 201);
});
apiRouter.get('/requests/vacations', async (request, response) =>
  ok(
    response,
    'Solicitudes de vacaciones obtenidas correctamente',
    await leaves.listOwnVacations(request.auth!.sub)
  )
);
apiRouter.delete('/requests/vacations/:id', async (request, response) => {
  const vacation = await leaves.cancelVacation(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'CANCEL', 'Vacation', vacation.id);
  return ok(response, 'Solicitud de vacaciones cancelada correctamente', vacation);
});
apiRouter.patch(
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

apiRouter.post('/requests/licenses', validate(licenseSchema), async (request, response) => {
  const license = await leaves.createLicense(request.auth!.sub, request.body);
  auditEvent(request, 'CREATE', 'License', license.id);
  return ok(response, 'Solicitud de licencia enviada correctamente', license, 201);
});
apiRouter.get('/requests/licenses', async (request, response) =>
  ok(
    response,
    'Solicitudes de licencia obtenidas correctamente',
    await leaves.listOwnLicenses(request.auth!.sub)
  )
);
apiRouter.delete('/requests/licenses/:id', async (request, response) => {
  const license = await leaves.cancelLicense(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'CANCEL', 'License', license.id);
  return ok(response, 'Solicitud de licencia cancelada correctamente', license);
});
apiRouter.patch(
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

apiRouter.get('/me/profile', async (request, response) =>
  ok(response, 'Perfil obtenido correctamente', await selfService.getProfile(request.auth!.sub))
);
apiRouter.patch('/me/profile', validate(profileSchema), async (request, response) => {
  const profile = await selfService.updateProfile(request.auth!.sub, request.body);
  auditEvent(request, 'UPDATE', 'OwnProfile', profile.id);
  return ok(response, 'Perfil actualizado correctamente', profile);
});
apiRouter.get('/me/attendance', async (request, response) => {
  const query = attendanceQuerySchema
    .pick({ page: true, limit: true, startDate: true, endDate: true, type: true, status: true })
    .parse(request.query);
  return ok(
    response,
    'Historial de asistencia obtenido correctamente',
    await selfService.attendanceHistory(request.auth!.sub, query)
  );
});
apiRouter.get('/me/last-attendance', async (request, response) => {
  return ok(
    response,
    'Último registro de asistencia obtenido correctamente',
    await selfService.getLastAttendance(request.auth!.sub)
  );
});
apiRouter.get('/me/requests', async (request, response) =>
  ok(
    response,
    'Historial de solicitudes obtenido correctamente',
    await selfService.requestHistory(request.auth!.sub)
  )
);
apiRouter.get('/me/request-summary', async (request, response) =>
  ok(
    response,
    'Resumen de solicitudes obtenido correctamente',
    await selfService.requestStatusSummary(request.auth!.sub)
  )
);
apiRouter.get('/me/notifications', async (request, response) => {
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
apiRouter.patch('/me/notifications/:id/read', async (request, response) => {
  await notifications.markRead(request.auth!.sub, String(request.params.id));
  return ok(response, 'Notificación marcada como leída');
});
apiRouter.patch('/me/notifications/read', async (request, response) => {
  await notifications.markAllRead(request.auth!.sub);
  return ok(response, 'Notificaciones marcadas como leídas');
});
apiRouter.get('/me/announcements', async (request, response) =>
  ok(
    response,
    'Anuncios obtenidos correctamente',
    await announcements.listForUser(request.auth!.sub)
  )
);
apiRouter.get('/me/devices', async (request, response) =>
  ok(
    response,
    'Dispositivos obtenidos correctamente',
    await selfService.listDevices(request.auth!.sub)
  )
);
apiRouter.post('/me/devices', validate(deviceRegistrationSchema), async (request, response) => {
  const device = await selfService.registerDevice(request.auth!.sub, {
    ...request.body,
    userAgent: request.header('user-agent'),
    ipAddress: request.ip
  });
  auditEvent(request, 'REGISTER', 'Device', device.id);
  return ok(response, 'Dispositivo registrado correctamente', device, 201);
});
apiRouter.delete('/me/devices/:id', async (request, response) => {
  await selfService.removeOwnDevice(request.auth!.sub, String(request.params.id));
  auditEvent(request, 'DELETE', 'Device', String(request.params.id));
  return response.status(204).send();
});

apiRouter.get('/attendance/history', authorize('attendances.read'), async (request, response) => {
  const query = attendanceQuerySchema.parse(request.query);
  return ok(
    response,
    'Historial de asistencias obtenido correctamente',
    await attendanceOperations.list(query)
  );
});
apiRouter.get('/attendance/statistics', authorize('statistics.read'), async (request, response) => {
  const query = statisticsQuerySchema.parse(request.query);
  return ok(
    response,
    'Estadísticas de asistencia obtenidas correctamente',
    await attendanceOperations.statistics(query)
  );
});
apiRouter.get('/attendance/calendar', authorize('calendar.read'), async (request, response) => {
  const query = calendarQuerySchema.parse(request.query);
  return ok(
    response,
    'Calendario operativo obtenido correctamente',
    await attendanceOperations.calendar(query.startDate, query.endDate, query)
  );
});
apiRouter.post('/attendance/offline-permit', async (request, response) => {
  const permit = await attendanceOperations.issueOfflinePermit(request.auth!.sub);
  auditEvent(request, 'ISSUE', 'OfflineAttendanceToken', permit.id);
  return ok(response, 'Permiso offline emitido correctamente', permit, 201);
});
apiRouter.post(
  '/attendance/offline-sync',
  validate(offlineAttendanceSchema),
  async (request, response) => {
    const record = await attendanceOperations.synchronizeOfflineAttendance(
      request.auth!.sub,
      request.body,
      meta(request)
    );
    auditEvent(request, 'SYNC', 'Attendance', record.id);
    return ok(response, 'Asistencia offline sincronizada correctamente', record, 201);
  }
);

apiRouter.get('/reports/:type/export', authorize('reports.read'), async (request, response) => {
  const type = z.enum(reportTypes).parse(request.params.type);
  const query = reportQuerySchema.parse(request.query);
  const exported = await reports.export(type, query.format, query);
  response.setHeader('content-type', exported.contentType);
  response.setHeader(
    'content-disposition',
    `attachment; filename="msa-${type.toLowerCase()}.${exported.extension}"`
  );
  return response.status(200).send(exported.content);
});
apiRouter.get('/reports/:type', authorize('reports.read'), async (request, response) => {
  const type = z.enum(reportTypes).parse(request.params.type);
  const query = reportQuerySchema.parse(request.query);
  return ok(response, 'Reporte obtenido correctamente', await reports.buildTable(type, query));
});

apiRouter.get('/dashboard/summary', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Resumen del dashboard obtenido', await dashboard.summary())
);
apiRouter.get('/dashboard/present', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Personal presente obtenido correctamente', await dashboard.presentEmployees())
);
apiRouter.get('/dashboard/absent', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Personal ausente obtenido correctamente', await dashboard.absentEmployees())
);
apiRouter.get('/dashboard/late', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Tardanzas obtenidas correctamente', await dashboard.lateArrivals())
);
apiRouter.get(
  '/dashboard/recent-activity',
  authorize('dashboard.read'),
  async (_request, response) =>
    ok(response, 'Actividad reciente obtenida correctamente', await dashboard.recentActivity())
);

apiRouter.post(
  '/employees/provision',
  authorize('employees.create'),
  validate(employeeProvisionSchema),
  async (request, response) => {
    const employee = await employees.create(request.body);
    auditEvent(request, 'CREATE', 'Employee', employee.id);
    return ok(response, 'Empleado registrado correctamente', employee, 201);
  }
);
apiRouter.put(
  '/employees/:id/assignments',
  authorize('employees.update'),
  validate(employeeUpdateSchema),
  async (request, response) => {
    const employee = await employees.update(String(request.params.id), request.body);
    auditEvent(request, 'UPDATE', 'Employee', employee.id);
    return ok(response, 'Empleado actualizado correctamente', employee);
  }
);
apiRouter.patch(
  '/employees/:id/assignments',
  authorize('employees.update'),
  validate(employeeUpdateSchema),
  async (request, response) => {
    const employee = await employees.update(String(request.params.id), request.body);
    auditEvent(request, 'UPDATE', 'Employee', employee.id);
    return ok(response, 'Empleado actualizado correctamente', employee);
  }
);
apiRouter.post(
  '/employees/import',
  authorize('imports.create'),
  upload.single('file'),
  async (request, response) => {
    if (!request.file?.buffer) throw new AppError(422, 'Debe adjuntar un archivo Excel .xlsx');
    if (!request.file.originalname.toLowerCase().endsWith('.xlsx'))
      throw new AppError(422, 'El archivo debe tener extensión .xlsx');
    const result = await employees.importWorkbook(request.file.buffer);
    auditEvent(request, 'IMPORT', 'Employee');
    return ok(response, 'Importación de empleados procesada correctamente', result, 201);
  }
);

apiRouter.get('/devices', authorize('devices.read'), async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.nativeEnum(DeviceStatus).optional(),
      userId: z.string().min(1).optional()
    })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Dispositivos obtenidos correctamente',
    await devices.list(query.page, query.limit, query.status, query.userId)
  );
});
apiRouter.patch(
  '/devices/:id/status',
  authorize('devices.update'),
  validate(deviceStatusSchema),
  async (request, response) => {
    const device = await devices.setStatus(String(request.params.id), request.body.status);
    await notifications.create({
      userId: device.userId,
      title: 'Estado de dispositivo actualizado',
      body: `Su dispositivo ${device.name ?? device.userAgent ?? 'registrado'} fue ${device.status === DeviceStatus.AUTHORIZED ? 'autorizado' : device.status === DeviceStatus.BLOCKED ? 'bloqueado' : 'puesto en revisión'}.`,
      type: 'DEVICE_STATUS'
    });
    auditEvent(request, 'UPDATE_STATUS', 'Device', device.id);
    return ok(response, 'Estado del dispositivo actualizado correctamente', device);
  }
);

apiRouter.get('/announcements', authorize('announcements.read'), async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      companyId: z.string().min(1).optional(),
      status: z.nativeEnum(AnnouncementStatus).optional()
    })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Anuncios obtenidos correctamente',
    await announcements.list(query.page, query.limit, query.companyId, query.status)
  );
});
apiRouter.post(
  '/announcements',
  authorize('announcements.create'),
  validate(announcementSchema),
  async (request, response) => {
    const announcement = await announcements.create(request.auth!.sub, request.body);
    auditEvent(request, 'CREATE', 'Announcement', announcement.id);
    return ok(response, 'Anuncio creado correctamente', announcement, 201);
  }
);
apiRouter.patch(
  '/announcements/:id/publish',
  authorize('announcements.update'),
  async (request, response) => {
    const announcement = await announcements.publish(String(request.params.id));
    auditEvent(request, 'PUBLISH', 'Announcement', announcement.id);
    return ok(response, 'Anuncio publicado correctamente', announcement);
  }
);
apiRouter.patch(
  '/announcements/:id/archive',
  authorize('announcements.update'),
  async (request, response) => {
    await announcements.archive(String(request.params.id));
    auditEvent(request, 'ARCHIVE', 'Announcement', String(request.params.id));
    return ok(response, 'Anuncio archivado correctamente');
  }
);

apiRouter.get('/audit-logs', authorize('audit-logs.read'), async (request, response) => {
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

apiRouter.get(
  '/companies/:companyId/settings',
  authorize('settings.read'),
  async (request, response) => {
    const settings = await prisma.setting.findMany({
      where: { companyId: String(request.params.companyId) },
      orderBy: { key: 'asc' }
    });
    return ok(response, 'Configuración obtenida correctamente', settings);
  }
);
apiRouter.put(
  '/companies/:companyId/settings',
  authorize('settings.update'),
  validate(companySettingsSchema),
  async (request, response) => {
    const companyId = String(request.params.companyId);
    await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { id: true } });
    await prisma.$transaction(
      request.body.settings.map((setting: { key: string; value: string }) =>
        prisma.setting.upsert({
          where: { companyId_key: { companyId, key: setting.key } },
          create: { companyId, key: setting.key, value: setting.value },
          update: { value: setting.value }
        })
      )
    );
    auditEvent(request, 'UPDATE', 'CompanySettings', companyId);
    return ok(response, 'Configuración actualizada correctamente');
  }
);
apiRouter.patch(
  '/companies/:companyId/identity',
  authorize('companies.update'),
  validate(companyIdentitySchema),
  async (request, response) => {
    const company = await prisma.company.update({
      where: { id: String(request.params.companyId) },
      data: request.body
    });
    auditEvent(request, 'UPDATE', 'Company', company.id);
    return ok(response, 'Identidad de empresa actualizada correctamente', company);
  }
);

apiRouter.get('/backups/schedule', authorize('backups.read'), async (request, response) => {
  const query = z
    .object({ companyId: z.string().min(1) })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Programación de respaldos obtenida correctamente',
    await backups.getSchedule(query.companyId)
  );
});
apiRouter.put(
  '/backups/schedule',
  authorize('backups.update'),
  validate(backupScheduleSchema),
  async (request, response) => {
    const { companyId, ...schedule } = request.body;
    const setting = await backups.setSchedule(companyId, schedule);
    auditEvent(request, 'SCHEDULE', 'Backup', companyId);
    return ok(response, 'Programación de respaldos actualizada correctamente', setting);
  }
);
apiRouter.get('/backups', authorize('backups.read'), async (request, response) => {
  const query = z
    .object({
      companyId: z.string().min(1),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    })
    .strict()
    .parse(request.query);
  return ok(
    response,
    'Respaldos obtenidos correctamente',
    await backups.list(query.companyId, query.page, query.limit)
  );
});
apiRouter.post(
  '/backups',
  authorize('backups.create'),
  validate(backupSchema),
  async (request, response) => {
    const backup = await backups.start(
      request.body.companyId,
      request.body.type,
      request.auth!.sub
    );
    auditEvent(request, 'CREATE', 'BackupRecord', backup.id);
    return ok(response, 'Respaldo iniciado correctamente', backup, 202);
  }
);
apiRouter.post(
  '/backups/:id/restore',
  authorize('backups.update'),
  validate(restoreSchema),
  async (request, response) => {
    const restored = await backups.restore(String(request.params.id), request.body.confirmation);
    auditEvent(request, 'RESTORE', 'BackupRecord', String(request.params.id));
    return ok(response, 'Respaldo restaurado correctamente', restored);
  }
);

apiRouter.get('/system/status', authorize('maintenance.read'), async (_request, response) =>
  ok(response, 'Estado del sistema obtenido correctamente', await system.status())
);
apiRouter.get('/system/logs', authorize('system-logs.read'), async (request, response) => {
  const query = z
    .object({
      kind: z.enum(['error', 'combined']).default('combined'),
      limit: z.coerce.number().int().min(1).max(500).default(100)
    })
    .strict()
    .parse(request.query);
  return ok(response, 'Logs obtenidos correctamente', await system.logs(query.kind, query.limit));
});
apiRouter.post(
  '/system/cleanup',
  authorize('maintenance.update'),
  validate(cleanupSchema),
  async (request, response) => {
    const result = await system.cleanExpiredData(request.body.retentionDays);
    auditEvent(request, 'CLEANUP', 'System');
    return ok(response, 'Limpieza de datos completada correctamente', result);
  }
);
apiRouter.post('/system/analyze', authorize('maintenance.update'), async (request, response) => {
  const result = await system.analyzeDatabase();
  auditEvent(request, 'ANALYZE', 'System');
  return ok(response, 'Análisis de base de datos completado correctamente', result);
});

const resourceDefinitions: [string, string, CrudDelegate, string][] = [
  ['/roles', 'Roles', prisma.role, 'roles'],
  ['/permissions', 'Permisos', prisma.permission, 'permissions'],
  ['/companies', 'Empresas', prisma.company, 'companies'],
  ['/sites', 'Sedes', prisma.site, 'sites'],
  ['/departments', 'Áreas', prisma.department, 'departments'],
  ['/positions', 'Cargos', prisma.position, 'positions'],
  ['/schedules', 'Horarios', prisma.schedule, 'schedules'],
  ['/site-schedules', 'Horarios por sede', prisma.siteSchedule, 'site-schedules'],
  ['/employees', 'Empleados', prisma.employee, 'employees'],
  ['/vacations', 'Vacaciones', prisma.vacation, 'vacations'],
  ['/work-permissions', 'Permisos laborales', prisma.workPermission, 'work-permissions'],
  ['/overtime-requests', 'Solicitudes de horas extra', prisma.overtimeRequest, 'overtime-requests'],
  ['/licenses', 'Licencias', prisma.license, 'licenses'],
  ['/holidays', 'Feriados', prisma.holiday, 'holidays'],
  ['/settings', 'Configuraciones', prisma.setting, 'settings'],
  ['/notifications', 'Notificaciones', prisma.notification, 'notifications'],
  ['/attendances', 'Asistencias', prisma.attendance, 'attendances']
];
resourceDefinitions.forEach(([path, label, delegate, resource]) =>
  mountCrud(apiRouter, path, label, delegate, resource)
);

apiRouter.post('/attendance/check', validate(attendanceSchema), async (request, response) => {
  const data = await attendance.execute(request.auth!.sub, request.body, meta(request));
  if (data.status === 'LATE') {
    await notifications.create({
      userId: request.auth!.sub,
      title: 'Entrada registrada con tardanza',
      body: 'Su entrada fue registrada fuera de la tolerancia del horario asignado.',
      type: 'LATE_ATTENDANCE'
    });
  }
  auditEvent(request, 'CREATE', 'Attendance', data.id);
  return ok(response, 'Asistencia registrada correctamente', data, 201);
});
