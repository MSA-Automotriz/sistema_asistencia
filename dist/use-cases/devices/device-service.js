import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
export class DeviceService {
    async list(page, limit, status, userId) {
        const where = {
            ...(status ? { status } : {}),
            ...(userId ? { userId } : {})
        };
        const [items, total] = await Promise.all([
            prisma.device.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { lastSeenAt: 'desc' },
                include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
            }),
            prisma.device.count({ where })
        ]);
        return { items, pagination: { page, limit, total } };
    }
    async setStatus(deviceId, status) {
        const result = await prisma.device.updateMany({ where: { id: deviceId }, data: { status } });
        if (!result.count)
            throw new AppError(404, 'Dispositivo no encontrado');
        return prisma.device.findUniqueOrThrow({
            where: { id: deviceId },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });
    }
}
//# sourceMappingURL=device-service.js.map