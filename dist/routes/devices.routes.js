import { Router } from 'express';
import { z } from 'zod';
import { DeviceStatus } from '@prisma/client';
import { DeviceService } from '../use-cases/devices/device-service.js';
import { NotificationService } from '../use-cases/notifications/notification-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';
const devices = new DeviceService();
const notifications = new NotificationService();
const deviceStatusSchema = z.object({
    body: z.object({ status: z.nativeEnum(DeviceStatus) }).strict()
});
export const devicesRouter = Router();
devicesRouter.get('/devices', authorize('devices.read'), async (request, response) => {
    const query = z
        .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.nativeEnum(DeviceStatus).optional(),
        userId: z.string().min(1).optional()
    })
        .strict()
        .parse(request.query);
    return ok(response, 'Dispositivos obtenidos correctamente', await devices.list(query.page, query.limit, query.status, query.userId));
});
devicesRouter.patch('/devices/:id/status', authorize('devices.update'), validate(deviceStatusSchema), async (request, response) => {
    const device = await devices.setStatus(String(request.params.id), request.body.status);
    await notifications.create({
        userId: device.userId,
        title: 'Estado de dispositivo actualizado',
        body: `Su dispositivo ${device.name ?? device.userAgent ?? 'registrado'} fue ${device.status === DeviceStatus.AUTHORIZED ? 'autorizado' : device.status === DeviceStatus.BLOCKED ? 'bloqueado' : 'puesto en revisión'}.`,
        type: 'DEVICE_STATUS'
    });
    auditEvent(request, 'UPDATE_STATUS', 'Device', device.id);
    return ok(response, 'Estado del dispositivo actualizado correctamente', device);
});
//# sourceMappingURL=devices.routes.js.map