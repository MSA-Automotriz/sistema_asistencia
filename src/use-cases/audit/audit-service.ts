import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export type AuditInput = {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  device?: string;
  metadata?: Prisma.InputJsonValue;
};

export class AuditService {
  async record(input: AuditInput) {
    return prisma.auditLog.create({ data: input });
  }

  async list(page: number, limit: number, entity?: string, userId?: string) {
    const where = { ...(entity ? { entity } : {}), ...(userId ? { userId } : {}) };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);
    return { items, pagination: { page, limit, total } };
  }
}