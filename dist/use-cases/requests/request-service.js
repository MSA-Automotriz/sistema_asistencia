import { RequestStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
const requestEmployee = {
    select: {
        id: true,
        employeeCode: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
};
export class RequestService {
    async listWorkPermissions(page, limit) {
        const [items, total] = await Promise.all([
            prisma.workPermission.findMany({
                skip: (page - 1) * limit,
                take: limit,
                include: { employee: requestEmployee },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.workPermission.count()
        ]);
        return { items, pagination: { page, limit, total } };
    }
    async listOvertimeRequests(page, limit) {
        const [items, total] = await Promise.all([
            prisma.overtimeRequest.findMany({
                skip: (page - 1) * limit,
                take: limit,
                include: { employee: requestEmployee },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
            }),
            prisma.overtimeRequest.count()
        ]);
        return { items, pagination: { page, limit, total } };
    }
    async createWorkPermission(userId, input) {
        const employee = await this.employeeForUser(userId);
        this.ensureValidPeriod(input.startDate, input.endDate);
        return prisma.workPermission.create({
            data: {
                employeeId: employee.id,
                startDate: input.startDate,
                endDate: input.endDate,
                reason: input.reason
            },
            include: { employee: requestEmployee }
        });
    }
    async listOwnWorkPermissions(userId) {
        const employee = await this.employeeForUser(userId);
        return prisma.workPermission.findMany({
            where: { employeeId: employee.id },
            include: { employee: requestEmployee },
            orderBy: { createdAt: 'desc' }
        });
    }
    async cancelWorkPermission(userId, requestId) {
        const employee = await this.employeeForUser(userId);
        const request = await prisma.workPermission.findFirst({
            where: { id: requestId, employeeId: employee.id }
        });
        if (!request)
            throw new AppError(404, 'Solicitud de permiso no encontrada');
        if (request.status !== RequestStatus.PENDING)
            throw new AppError(400, 'Solo puede cancelar solicitudes pendientes');
        return prisma.workPermission.update({
            where: { id: requestId },
            data: { status: RequestStatus.CANCELLED },
            include: { employee: requestEmployee }
        });
    }
    async reviewWorkPermission(requestId, status, reviewedById) {
        const request = await prisma.workPermission.findUnique({ where: { id: requestId } });
        if (!request)
            throw new AppError(404, 'Solicitud de permiso no encontrada');
        if (request.status !== RequestStatus.PENDING)
            throw new AppError(400, 'La solicitud ya fue procesada');
        return prisma.workPermission.update({
            where: { id: requestId },
            data: { status, reviewedById, reviewedAt: new Date() },
            include: { employee: requestEmployee }
        });
    }
    async createOvertimeRequest(userId, input) {
        const employee = await this.employeeForUser(userId);
        return prisma.overtimeRequest.create({
            data: {
                employeeId: employee.id,
                date: input.date,
                requestedMinutes: input.requestedMinutes,
                reason: input.reason
            },
            include: { employee: requestEmployee }
        });
    }
    async listOwnOvertimeRequests(userId) {
        const employee = await this.employeeForUser(userId);
        return prisma.overtimeRequest.findMany({
            where: { employeeId: employee.id },
            include: { employee: requestEmployee },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });
    }
    async cancelOvertimeRequest(userId, requestId) {
        const employee = await this.employeeForUser(userId);
        const request = await prisma.overtimeRequest.findFirst({
            where: { id: requestId, employeeId: employee.id }
        });
        if (!request)
            throw new AppError(404, 'Solicitud de horas extra no encontrada');
        if (request.status !== RequestStatus.PENDING)
            throw new AppError(400, 'Solo puede cancelar solicitudes pendientes');
        return prisma.overtimeRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.CANCELLED },
            include: { employee: requestEmployee }
        });
    }
    async reviewOvertimeRequest(requestId, status, reviewedById) {
        const request = await prisma.overtimeRequest.findUnique({ where: { id: requestId } });
        if (!request)
            throw new AppError(404, 'Solicitud de horas extra no encontrada');
        if (request.status !== RequestStatus.PENDING)
            throw new AppError(400, 'La solicitud ya fue procesada');
        return prisma.overtimeRequest.update({
            where: { id: requestId },
            data: { status, reviewedById, reviewedAt: new Date() },
            include: { employee: requestEmployee }
        });
    }
    async employeeForUser(userId) {
        const employee = await prisma.employee.findUnique({
            where: { userId },
            select: { id: true, active: true }
        });
        if (!employee || !employee.active)
            throw new AppError(403, 'No tiene un perfil de empleado activo para realizar esta solicitud');
        return employee;
    }
    ensureValidPeriod(startDate, endDate) {
        if (endDate < startDate)
            throw new AppError(400, 'La fecha de fin debe ser posterior a la fecha de inicio');
    }
}
//# sourceMappingURL=request-service.js.map