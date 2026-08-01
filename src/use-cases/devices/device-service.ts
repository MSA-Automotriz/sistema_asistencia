import type { DeviceStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export class DeviceService {
  async list(page: number, limit: number, status?: DeviceStatus, userId?: string) {
    const where: Prisma.DeviceWhereInput = { ...(status ? { status } : {}), ...(userId ? { userId } : {}) };
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

  async setStatus(deviceId: string, status: DeviceStatus) {
    const result = await prisma.device.updateMany({ where: { id: deviceId }, data: { status } });
    if (!result.count) throw new AppError(404, 'Dispositivo no encontrado');
    return prisma.device.findUniqueOrThrow({
      where: { id: deviceId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
  }
}