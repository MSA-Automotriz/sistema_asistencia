import { DeviceStatus, RequestStatus } from '@prisma/client';
import type { AttendanceStatus, AttendanceType, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export type AttendanceHistoryFilters = {
  startDate?: Date;
  endDate?: Date;
  type?: AttendanceType;
  status?: AttendanceStatus;
  page: number;
  limit: number;
};

export type UpdateOwnProfileInput = {
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string | null;
};

export type RegisterDeviceInput = {
  fingerprint: string;
  name?: string;
  userAgent?: string;
  ipAddress?: string;
};

const profileSelect = {
  id: true,
  employeeCode: true,
  qrCode: true,
  profilePhotoUrl: true,
  hiredAt: true,
  active: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
  company: { select: { id: true, name: true, timeZone: true, logoUrl: true } },
  site: { select: { id: true, name: true, address: true, latitude: true, longitude: true, radiusMeters: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  schedule: {
    select: {
      id: true,
      name: true,
      type: true,
      startTime: true,
      endTime: true,
      toleranceMinutes: true,
      flexibleWindowMinutes: true,
      breakStartTime: true,
      breakEndTime: true,
      workDays: true
    }
  },
  supervisor: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { firstName: true, lastName: true, email: true } }
    }
  }
} satisfies Prisma.EmployeeSelect;

export class EmployeeSelfService {
  async getProfile(userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId }, select: profileSelect });
    if (!employee) throw new AppError(404, 'Perfil de empleado no encontrado');
    return employee;
  }

  async updateProfile(userId: string, input: UpdateOwnProfileInput) {
    await this.getProfile(userId);
    return prisma.$transaction(async (transaction) => {
      if (input.firstName || input.lastName) {
        await transaction.user.update({
          where: { id: userId },
          data: { firstName: input.firstName, lastName: input.lastName }
        });
      }
      if (input.profilePhotoUrl !== undefined) {
        await transaction.employee.update({
          where: { userId },
          data: { profilePhotoUrl: input.profilePhotoUrl }
        });
      }
      return transaction.employee.findUniqueOrThrow({ where: { userId }, select: profileSelect });
    });
  }

  async attendanceHistory(userId: string, filters: AttendanceHistoryFilters) {
    const employee = await this.activeEmployeeForUser(userId);
    const recordedAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {})
    };
    const where: Prisma.AttendanceWhereInput = {
      employeeId: employee.id,
      ...(Object.keys(recordedAt).length ? { recordedAt } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {})
    };
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { recordedAt: 'desc' },
        include: { site: { select: { id: true, name: true, address: true } } }
      }),
      prisma.attendance.count({ where })
    ]);
    return { items, pagination: { page: filters.page, limit: filters.limit, total } };
  }

  async requestHistory(userId: string) {
    const employee = await this.activeEmployeeForUser(userId);
    const [vacations, licenses, permissions, overtime] = await Promise.all([
      prisma.vacation.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } }),
      prisma.license.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } }),
      prisma.workPermission.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } }),
      prisma.overtimeRequest.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } })
    ]);
    const items = [
      ...vacations.map((request) => ({
        id: request.id,
        type: 'VACATION' as const,
        status: request.status,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        reviewedAt: request.reviewedAt,
        reviewNote: request.reviewNote,
        createdAt: request.createdAt
      })),
      ...licenses.map((request) => ({
        id: request.id,
        type: 'LICENSE' as const,
        status: request.status,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        licenseType: request.type,
        reviewedAt: request.reviewedAt,
        reviewNote: request.reviewNote,
        createdAt: request.createdAt
      })),
      ...permissions.map((request) => ({
        id: request.id,
        type: 'WORK_PERMISSION' as const,
        status: request.status,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt
      })),
      ...overtime.map((request) => ({
        id: request.id,
        type: 'OVERTIME' as const,
        status: request.status,
        date: request.date,
        requestedMinutes: request.requestedMinutes,
        reason: request.reason,
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt
      }))
    ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return { items, total: items.length };
  }

  async listDevices(userId: string) {
    return prisma.device.findMany({ where: { userId }, orderBy: { lastSeenAt: 'desc' } });
  }

  async registerDevice(userId: string, input: RegisterDeviceInput) {
    return prisma.device.upsert({
      where: { userId_fingerprint: { userId, fingerprint: input.fingerprint } },
      create: {
        userId,
        fingerprint: input.fingerprint,
        name: input.name,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        status: DeviceStatus.PENDING
      },
      update: {
        name: input.name,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        lastSeenAt: new Date()
      }
    });
  }

  async removeOwnDevice(userId: string, deviceId: string) {
    const result = await prisma.device.deleteMany({ where: { id: deviceId, userId } });
    if (!result.count) throw new AppError(404, 'Dispositivo no encontrado');
  }

  async requestStatusSummary(userId: string) {
    const employee = await this.activeEmployeeForUser(userId);
    const [vacations, licenses, permissions, overtime] = await Promise.all([
      prisma.vacation.count({ where: { employeeId: employee.id, status: RequestStatus.PENDING } }),
      prisma.license.count({ where: { employeeId: employee.id, status: RequestStatus.PENDING } }),
      prisma.workPermission.count({ where: { employeeId: employee.id, status: RequestStatus.PENDING } }),
      prisma.overtimeRequest.count({ where: { employeeId: employee.id, status: RequestStatus.PENDING } })
    ]);
    return { vacations, licenses, workPermissions: permissions, overtime, total: vacations + licenses + permissions + overtime };
  }

  private async activeEmployeeForUser(userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true, active: true } });
    if (!employee || !employee.active)
      throw new AppError(403, 'No tiene un perfil de empleado activo');
    return employee;
  }
}