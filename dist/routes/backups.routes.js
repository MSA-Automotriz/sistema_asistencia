import { Router } from 'express';
import { z } from 'zod';
import { BackupType } from '@prisma/client';
import { BackupService } from '../use-cases/backups/backup-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';
const backups = new BackupService();
const backupSchema = z.object({
    body: z.object({ companyId: z.string().min(1), type: z.nativeEnum(BackupType) }).strict()
});
const restoreSchema = z.object({
    body: z.object({ confirmation: z.literal('RESTORE') }).strict()
});
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
export const backupsRouter = Router();
backupsRouter.get('/backups/schedule', authorize('backups.read'), async (request, response) => {
    const query = z
        .object({ companyId: z.string().min(1) })
        .strict()
        .parse(request.query);
    return ok(response, 'Programación de respaldos obtenida correctamente', await backups.getSchedule(query.companyId));
});
backupsRouter.put('/backups/schedule', authorize('backups.update'), validate(backupScheduleSchema), async (request, response) => {
    const { companyId, ...schedule } = request.body;
    const setting = await backups.setSchedule(companyId, schedule);
    auditEvent(request, 'SCHEDULE', 'Backup', companyId);
    return ok(response, 'Programación de respaldos actualizada correctamente', setting);
});
backupsRouter.get('/backups', authorize('backups.read'), async (request, response) => {
    const query = z
        .object({
        companyId: z.string().min(1),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20)
    })
        .strict()
        .parse(request.query);
    return ok(response, 'Respaldos obtenidos correctamente', await backups.list(query.companyId, query.page, query.limit));
});
backupsRouter.post('/backups', authorize('backups.create'), validate(backupSchema), async (request, response) => {
    const backup = await backups.start(request.body.companyId, request.body.type, request.auth.sub);
    auditEvent(request, 'CREATE', 'BackupRecord', backup.id);
    return ok(response, 'Respaldo iniciado correctamente', backup, 202);
});
backupsRouter.post('/backups/:id/restore', authorize('backups.update'), validate(restoreSchema), async (request, response) => {
    const restored = await backups.restore(String(request.params.id), request.body.confirmation);
    auditEvent(request, 'RESTORE', 'BackupRecord', String(request.params.id));
    return ok(response, 'Respaldo restaurado correctamente', restored);
});
//# sourceMappingURL=backups.routes.js.map