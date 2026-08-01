import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CrudController } from '../controllers/crud-controller.js';
import { AuthService } from '../use-cases/auth/auth-service.js';
import { RegisterAttendance } from '../use-cases/attendance/register-attendance.js';
import { AppError } from '../common/errors/app-error.js';
import { ok } from '../common/http/response.js';
import { env } from '../config/env.js';
import { hashToken, randomToken } from '../utils/crypto.js';
import { AttendanceType } from '@prisma/client';

const auth = new AuthService();
const attendance = new RegisterAttendance();
const meta = (request: Request) => ({ ip: request.ip, userAgent: request.header('user-agent') });
const authSchema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) });
const refreshSchema = z.object({ body: z.object({ refreshToken: z.string().min(40) }) });
const attendanceSchema = z.object({ body: z.object({ qrToken: z.string().min(20), latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180), type: z.nativeEnum(AttendanceType), approximateAddress: z.string().max(300).optional(), connectionType: z.string().max(80).optional() }) });
type CrudDelegate = unknown;

const mountCrud = (router: Router, path: string, label: string, delegate: CrudDelegate, resource: string) => {
  const controller = new CrudController(delegate, label);
  router.get(path, authorize(`${resource}.read`), controller.list);
  router.get(`${path}/:id`, authorize(`${resource}.read`), controller.get);
  router.post(path, authorize(`${resource}.create`), controller.create);
  router.put(`${path}/:id`, authorize(`${resource}.update`), controller.update);
  router.patch(`${path}/:id`, authorize(`${resource}.update`), controller.update);
  router.delete(`${path}/:id`, authorize(`${resource}.delete`), controller.remove);
};

export const apiRouter = Router();
apiRouter.get('/health', (_request, response) => ok(response, 'Servicio disponible', { status: 'healthy' }));

apiRouter.post('/auth/login', validate(authSchema), async (request, response) => ok(response, 'Inicio de sesión correcto', await auth.login(request.body.email, request.body.password, meta(request))));
apiRouter.post('/auth/refresh', validate(refreshSchema), async (request, response) => ok(response, 'Token renovado correctamente', await auth.refresh(request.body.refreshToken, meta(request))));
apiRouter.post('/auth/logout', validate(refreshSchema), async (request, response) => { await auth.logout(request.body.refreshToken); return ok(response, 'Sesión cerrada correctamente'); });
apiRouter.post('/auth/change-password', authenticate, validate(z.object({ body: z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(12) }) })), async (request, response) => { await auth.changePassword(request.auth!.sub, request.body.currentPassword, request.body.newPassword); return ok(response, 'Contraseña actualizada; las sesiones fueron revocadas'); });
apiRouter.get('/auth/sessions', authenticate, async (request, response) => ok(response, 'Sesiones activas obtenidas', await prisma.session.findMany({ where: { userId: request.auth!.sub, revokedAt: null }, select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true } })));
apiRouter.delete('/auth/sessions', authenticate, async (request, response) => { await auth.revokeAll(request.auth!.sub); return response.status(204).send(); });

apiRouter.use(authenticate);
const resourceDefinitions: [string, string, CrudDelegate, string][] = [
  ['/users', 'Usuarios', prisma.user, 'users'], ['/roles', 'Roles', prisma.role, 'roles'], ['/permissions', 'Permisos', prisma.permission, 'permissions'], ['/companies', 'Empresas', prisma.company, 'companies'], ['/sites', 'Sedes', prisma.site, 'sites'], ['/departments', 'Áreas', prisma.department, 'departments'], ['/positions', 'Cargos', prisma.position, 'positions'], ['/schedules', 'Horarios', prisma.schedule, 'schedules'], ['/employees', 'Empleados', prisma.employee, 'employees'], ['/vacations', 'Vacaciones', prisma.vacation, 'vacations'], ['/work-permissions', 'Permisos laborales', prisma.workPermission, 'work-permissions'], ['/licenses', 'Licencias', prisma.license, 'licenses'], ['/holidays', 'Feriados', prisma.holiday, 'holidays'], ['/settings', 'Configuraciones', prisma.setting, 'settings'], ['/notifications', 'Notificaciones', prisma.notification, 'notifications'], ['/attendances', 'Asistencias', prisma.attendance, 'attendances']
];
resourceDefinitions.forEach(([path, label, delegate, resource]) => mountCrud(apiRouter, path, label, delegate, resource));

apiRouter.post('/qr/site/:siteId', authorize('qr.create'), async (request, response, next) => {
  const site = await prisma.site.findUnique({ where: { id: String(request.params.siteId) } });
  if (!site) return next(new AppError(404, 'Sede no encontrada'));
  const rawToken = randomToken();
  const qr = await prisma.qrToken.create({ data: { siteId: site.id, tokenHash: hashToken(rawToken), createdById: request.auth!.sub, expiresAt: new Date(Date.now() + env.QR_EXPIRATION_SECONDS * 1000) } });
  return ok(response, 'Código QR dinámico generado correctamente', { id: qr.id, token: rawToken, expiresAt: qr.expiresAt }, 201);
});

apiRouter.post('/attendance/check', validate(attendanceSchema), async (request, response) => {
  const userAgent = request.header('user-agent') ?? 'unknown';
  const data = await attendance.execute(request.auth!.sub, request.body, { ip: request.ip, browser: userAgent, device: userAgent });
  return ok(response, 'Asistencia registrada correctamente', data, 201);
});

apiRouter.get('/dashboard/summary', authorize('dashboard.read'), async (_request, response) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [entries, exits, late, present] = await Promise.all([
    prisma.attendance.count({ where: { recordedAt: { gte: start }, type: 'CHECK_IN' } }),
    prisma.attendance.count({ where: { recordedAt: { gte: start }, type: 'CHECK_OUT' } }),
    prisma.attendance.count({ where: { recordedAt: { gte: start }, status: 'LATE' } }),
    prisma.attendance.groupBy({ by: ['employeeId'], where: { recordedAt: { gte: start }, type: 'CHECK_IN' } })
  ]);
  const activeEmployees = await prisma.employee.count({ where: { active: true } });
  return ok(response, 'Resumen del dashboard obtenido', { personalPresente: present.length, ausentes: Math.max(activeEmployees - present.length, 0), tardanzas: late, horasExtras: 0, entradasHoy: entries, salidasHoy: exits, graficos: { entradas: entries, salidas: exits }, ranking: [], empleadoDelMes: null });
});