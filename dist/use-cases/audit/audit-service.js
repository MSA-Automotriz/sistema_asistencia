import { prisma } from '../../database/prisma.js';
export class AuditService {
    async record(input) {
        return prisma.auditLog.create({ data: input });
    }
    async list(page, limit, entity, userId) {
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
//# sourceMappingURL=audit-service.js.map