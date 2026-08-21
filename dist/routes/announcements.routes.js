import { Router } from 'express';
import { z } from 'zod';
import { AnnouncementStatus } from '@prisma/client';
import { AnnouncementService } from '../use-cases/announcements/announcement-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';
const announcements = new AnnouncementService();
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
export const announcementsRouter = Router();
announcementsRouter.get('/announcements', authorize('announcements.read'), async (request, response) => {
    const query = z
        .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        companyId: z.string().min(1).optional(),
        status: z.nativeEnum(AnnouncementStatus).optional()
    })
        .strict()
        .parse(request.query);
    return ok(response, 'Anuncios obtenidos correctamente', await announcements.list(query.page, query.limit, query.companyId, query.status));
});
announcementsRouter.post('/announcements', authorize('announcements.create'), validate(announcementSchema), async (request, response) => {
    const announcement = await announcements.create(request.auth.sub, request.body);
    auditEvent(request, 'CREATE', 'Announcement', announcement.id);
    return ok(response, 'Anuncio creado correctamente', announcement, 201);
});
announcementsRouter.patch('/announcements/:id/publish', authorize('announcements.update'), async (request, response) => {
    const announcement = await announcements.publish(String(request.params.id));
    auditEvent(request, 'PUBLISH', 'Announcement', announcement.id);
    return ok(response, 'Anuncio publicado correctamente', announcement);
});
announcementsRouter.patch('/announcements/:id/archive', authorize('announcements.update'), async (request, response) => {
    await announcements.archive(String(request.params.id));
    auditEvent(request, 'ARCHIVE', 'Announcement', String(request.params.id));
    return ok(response, 'Anuncio archivado correctamente');
});
//# sourceMappingURL=announcements.routes.js.map