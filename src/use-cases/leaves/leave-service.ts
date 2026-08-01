import { RequestStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export type VacationInput = {
  startDate: Date;
  endDate: Date;
  reason?: string;
};

export type LicenseInput = VacationInput & {
  type: string;
};

export type LeaveReviewInput = {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
};

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
  async listVacations(page: number, limit: number) {
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

  async listLicenses(page: number, limit: number) {
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

  async createVacation(userId: string, input: VacationInput) {
    const employee = await this.employeeForUser(userId);
    this.ensureValidPeriod(input.startDate, input.endDate);
    await this.ensureNoOverlap('vacation', employee.id, input.startDate, input.endDate);
    return prisma.vacation.create({
      data: { employeeId: employee.id, ...input },
      include: { employee: employeeDetails }
    });
  }

  async listOwnVacations(userId: string) {
    const employee = await this.employeeForUser(userId);
    return prisma.vacation.findMany({
      where: { employeeId: employee.id },
      include: { employee: employeeDetails },
      orderBy: { createdAt: 'desc' }
    });
  }

  async cancelVacation(userId: string, vacationId: string) {
    const employee = await this.employeeForUser(userId);
    const vacation = await prisma.vacation.findFirst({ where: { id: vacationId, employeeId: employee.id } });
    if (!vacation) throw new AppError(404, 'Solicitud de vacaciones no encontrada');
    this.ensurePending(vacation.status);
    return prisma.vacation.update({
      where: { id: vacationId },
      data: { status: RequestStatus.CANCELLED },
      include: { employee: employeeDetails }
    });
  }

  async reviewVacation(vacationId: string, reviewerId: string, input: LeaveReviewInput) {
    const vacation = await prisma.vacation.findUnique({ where: { id: vacationId } });
    if (!vacation) throw new AppError(404, 'Solicitud de vacaciones no encontrada');
    this.ensurePending(vacation.status);
    return prisma.vacation.update({
      where: { id: vacationId },
      data: { status: input.status, approvedById: reviewerId, reviewedAt: new Date(), reviewNote: input.reviewNote },
      include: { employee: employeeDetails }
    });
  }

  async createLicense(userId: string, input: LicenseInput) {
    const employee = await this.employeeForUser(userId);
    this.ensureValidPeriod(input.startDate, input.endDate);
    await this.ensureNoOverlap('license', employee.id, input.startDate, input.endDate);
    return prisma.license.create({
      data: { employeeId: employee.id, ...input },
      include: { employee: employeeDetails }
    });
  }

  async listOwnLicenses(userId: string) {
    const employee = await this.employeeForUser(userId);
    return prisma.license.findMany({
      where: { employeeId: employee.id },
      include: { employee: employeeDetails },
      orderBy: { createdAt: 'desc' }
    });
  }

  async cancelLicense(userId: string, licenseId: string) {
    const employee = await this.employeeForUser(userId);
    const license = await prisma.license.findFirst({ where: { id: licenseId, employeeId: employee.id } });
    if (!license) throw new AppError(404, 'Solicitud de licencia no encontrada');
    this.ensurePending(license.status);
    return prisma.license.update({
      where: { id: licenseId },
      data: { status: RequestStatus.CANCELLED },
      include: { employee: employeeDetails }
    });
  }

  async reviewLicense(licenseId: string, reviewerId: string, input: LeaveReviewInput) {
    const license = await prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) throw new AppError(404, 'Solicitud de licencia no encontrada');
    this.ensurePending(license.status);
    return prisma.license.update({
      where: { id: licenseId },
      data: { status: input.status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.reviewNote },
      include: { employee: employeeDetails }
    });
  }

  private async employeeForUser(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, active: true }
    });
    if (!employee || !employee.active)
      throw new AppError(403, 'No tiene un perfil de empleado activo para realizar esta solicitud');
    return employee;
  }

  private async ensureNoOverlap(
    type: 'vacation' | 'license',
    employeeId: string,
    startDate: Date,
    endDate: Date
  ) {
    const where = {
      employeeId,
      status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    };
    const overlap = type === 'vacation'
      ? await prisma.vacation.findFirst({ where, select: { id: true } })
      : await prisma.license.findFirst({ where, select: { id: true } });
    if (overlap) throw new AppError(409, `Ya tiene una ${type === 'vacation' ? 'vacación' : 'licencia'} pendiente o aprobada en ese período`);
  }

  private ensureValidPeriod(startDate: Date, endDate: Date) {
    if (endDate < startDate)
      throw new AppError(400, 'La fecha de fin debe ser posterior a la fecha de inicio');
  }

  private ensurePending(status: RequestStatus) {
    if (status !== RequestStatus.PENDING)
      throw new AppError(400, 'Solo puede procesar solicitudes pendientes');
  }
}