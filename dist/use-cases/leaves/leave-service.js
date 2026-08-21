import { RequestStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
const employeeDetails = {
    select: {
        id: true,
        employeeCode: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } }
    }
};
export class LeaveService {
    async listVacations(page, limit) {
        const [items, total] = await Promise.all([
            prisma.vacation.findMany({
                skip: (page - 1) * limit,
                take: limit,
                include: { employee: employeeDetails },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.vacation.count()
        ]);
        return { items, pagination: { page, limit, total } };
    }
    async listLicenses(page, limit) {
        const [items, total] = await Promise.all([
            prisma.license.findMany({
                skip: (page - 1) * limit,
                take: limit,
                include: { employee: employeeDetails },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.license.count()
        ]);
        return { items, pagination: { page, limit, total } };
    }
    async createVacation(userId, input) {
        const employee = await this.employeeForUser(userId);
        this.ensureValidPeriod(input.startDate, input.endDate);
        await this.ensureNoOverlap('vacation', employee.id, input.startDate, input.endDate);
        return prisma.vacation.create({
            data: { employeeId: employee.id, ...input },
            include: { employee: employeeDetails }
        });
    }
    async listOwnVacations(userId) {
        const employee = await this.employeeForUser(userId);
        return prisma.vacation.findMany({
            where: { employeeId: employee.id },
            include: { employee: employeeDetails },
            orderBy: { createdAt: 'desc' }
        });
    }
    async cancelVacation(userId, vacationId) {
        const employee = await this.employeeForUser(userId);
        const vacation = await prisma.vacation.findFirst({
            where: { id: vacationId, employeeId: employee.id }
        });
        if (!vacation)
            throw new AppError(404, 'Solicitud de vacaciones no encontrada');
        this.ensurePending(vacation.status);
        return prisma.vacation.update({
            where: { id: vacationId },
            data: { status: RequestStatus.CANCELLED },
            include: { employee: employeeDetails }
        });
    }
    async reviewVacation(vacationId, reviewerId, input) {
        const vacation = await prisma.vacation.findUnique({ where: { id: vacationId } });
        if (!vacation)
            throw new AppError(404, 'Solicitud de vacaciones no encontrada');
        this.ensurePending(vacation.status);
        return prisma.vacation.update({
            where: { id: vacationId },
            data: {
                status: input.status,
                approvedById: reviewerId,
                reviewedAt: new Date(),
                reviewNote: input.reviewNote
            },
            include: { employee: employeeDetails }
        });
    }
    async createLicense(userId, input) {
        const employee = await this.employeeForUser(userId);
        this.ensureValidPeriod(input.startDate, input.endDate);
        await this.ensureNoOverlap('license', employee.id, input.startDate, input.endDate);
        return prisma.license.create({
            data: { employeeId: employee.id, ...input },
            include: { employee: employeeDetails }
        });
    }
    async listOwnLicenses(userId) {
        const employee = await this.employeeForUser(userId);
        return prisma.license.findMany({
            where: { employeeId: employee.id },
            include: { employee: employeeDetails },
            orderBy: { createdAt: 'desc' }
        });
    }
    async cancelLicense(userId, licenseId) {
        const employee = await this.employeeForUser(userId);
        const license = await prisma.license.findFirst({
            where: { id: licenseId, employeeId: employee.id }
        });
        if (!license)
            throw new AppError(404, 'Solicitud de licencia no encontrada');
        this.ensurePending(license.status);
        return prisma.license.update({
            where: { id: licenseId },
            data: { status: RequestStatus.CANCELLED },
            include: { employee: employeeDetails }
        });
    }
    async reviewLicense(licenseId, reviewerId, input) {
        const license = await prisma.license.findUnique({ where: { id: licenseId } });
        if (!license)
            throw new AppError(404, 'Solicitud de licencia no encontrada');
        this.ensurePending(license.status);
        return prisma.license.update({
            where: { id: licenseId },
            data: {
                status: input.status,
                reviewedById: reviewerId,
                reviewedAt: new Date(),
                reviewNote: input.reviewNote
            },
            include: { employee: employeeDetails }
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
    async ensureNoOverlap(type, employeeId, startDate, endDate) {
        const where = {
            employeeId,
            status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
            startDate: { lte: endDate },
            endDate: { gte: startDate }
        };
        const overlap = type === 'vacation'
            ? await prisma.vacation.findFirst({ where, select: { id: true } })
            : await prisma.license.findFirst({ where, select: { id: true } });
        if (overlap)
            throw new AppError(409, `Ya tiene una ${type === 'vacation' ? 'vacación' : 'licencia'} pendiente o aprobada en ese período`);
    }
    ensureValidPeriod(startDate, endDate) {
        if (endDate < startDate)
            throw new AppError(400, 'La fecha de fin debe ser posterior a la fecha de inicio');
    }
    ensurePending(status) {
        if (status !== RequestStatus.PENDING)
            throw new AppError(400, 'Solo puede procesar solicitudes pendientes');
    }
}
//# sourceMappingURL=leave-service.js.map