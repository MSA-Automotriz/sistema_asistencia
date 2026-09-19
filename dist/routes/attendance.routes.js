import { Router } from 'express';
import { z } from 'zod';
import { AttendanceType } from '@prisma/client';
import { RegisterAttendance } from '../use-cases/attendance/register-attendance.js';
import { AttendanceOperationsService } from '../use-cases/attendance/attendance-operations-service.js';
import { NotificationService } from '../use-cases/notifications/notification-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent, meta } from './helpers.js';
const attendance = new RegisterAttendance();
const attendanceOperations = new AttendanceOperationsService();
const notifications = new NotificationService();
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
export const attendanceRouter = Router();
attendanceRouter.post('/attendance/check', validate(attendanceSchema), async (request, response) => {
    const data = await attendance.execute(request.auth.sub, request.body, meta(request));
    if (data.status === 'LATE') {
        await notifications.create({
            userId: request.auth.sub,
            title: 'Entrada registrada con tardanza',
            body: 'Su entrada fue registrada fuera de la tolerancia del horario asignado.',
            type: 'LATE_ATTENDANCE'
        });
    }
    auditEvent(request, 'CREATE', 'Attendance', data.id);
    return ok(response, 'Asistencia registrada correctamente', data, 201);
});
attendanceRouter.get('/attendance/history', authorize('attendances.read'), async (request, response) => {
    const query = attendanceQuerySchema.parse(request.query);
    return ok(response, 'Historial de asistencias obtenido correctamente', await attendanceOperations.list(query));
});
attendanceRouter.get('/attendance/statistics', authorize('statistics.read'), async (request, response) => {
    const query = statisticsQuerySchema.parse(request.query);
    return ok(response, 'Estadísticas de asistencia obtenidas correctamente', await attendanceOperations.statistics(query));
});
attendanceRouter.get('/attendance/calendar', async (request, response) => {
    const query = calendarQuerySchema.parse(request.query);
    const userPermissions = request.auth?.permissions ?? [];
    const userRole = String(request.auth?.role ?? '').trim().toLowerCase();
    const isEmployeeOnly = userRole === 'empleado' ||
        userRole.includes('empleado') ||
        (!userPermissions.includes('attendances.read') &&
            !userPermissions.includes('reports.read') &&
            !userPermissions.includes('statistics.read'));
    return ok(response, 'Calendario operativo obtenido correctamente', await attendanceOperations.calendar(query.startDate, query.endDate, query, isEmployeeOnly));
});
attendanceRouter.post('/attendance/offline-permit', async (request, response) => {
    const permit = await attendanceOperations.issueOfflinePermit(request.auth.sub);
    auditEvent(request, 'ISSUE', 'OfflineAttendanceToken', permit.id);
    return ok(response, 'Permiso offline emitido correctamente', permit, 201);
});
attendanceRouter.post('/attendance/offline-sync', validate(offlineAttendanceSchema), async (request, response) => {
    const record = await attendanceOperations.synchronizeOfflineAttendance(request.auth.sub, request.body, meta(request));
    auditEvent(request, 'SYNC', 'Attendance', record.id);
    return ok(response, 'Asistencia offline sincronizada correctamente', record, 201);
});
//# sourceMappingURL=attendance.routes.js.map