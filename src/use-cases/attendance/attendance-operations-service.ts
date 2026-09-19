import type { AttendanceStatus, AttendanceType, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { hashToken, haversineMeters, randomToken } from '../../utils/crypto.js';
import { parseUserAgent } from '../../utils/user-agent.js';
import {
  determineAttendanceStatus,
  getEffectiveBreakMinutesForToday
} from './attendance-rules.js';

export type AttendanceFilters = {
  employeeId?: string;
  siteId?: string;
  companyId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: AttendanceType;
  status?: AttendanceStatus;
  search?: string;
  page: number;
  limit: number;
};

export type OfflineAttendanceInput = {
  offlineToken: string;
  latitude: number;
  longitude: number;
  type: AttendanceType;
  recordedAt: Date;
  approximateAddress?: string;
  connectionType?: string;
  deviceFingerprint?: string;
};

export type AttendanceMeta = {
  ip?: string;
  userAgent?: string;
};

const employeeSummary = {
  select: {
    id: true,
    employeeCode: true,
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
    department: { select: { id: true, name: true } },
    position: { select: { id: true, name: true } }
  }
};

export class AttendanceOperationsService {
  async list(filters: AttendanceFilters) {
    const where = this.attendanceWhere(filters);
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { recordedAt: 'desc' },
        include: {
          employee: employeeSummary,
          site: { select: { id: true, name: true, address: true } }
        }
      }),
      prisma.attendance.count({ where })
    ]);
    return { items, pagination: { page: filters.page, limit: filters.limit, total } };
  }

  async statistics(
    filters: Omit<AttendanceFilters, 'page' | 'limit' | 'search' | 'type' | 'status'>
  ) {
    const endDate = filters.endDate ?? new Date();
    const startDate = filters.startDate ?? this.daysBefore(endDate, 29);
    const scopedFilters: AttendanceFilters = { ...filters, startDate, endDate, page: 1, limit: 1 };
    const where = this.attendanceWhere(scopedFilters);
    const employeeWhere = this.employeeWhere(filters);
    const [records, activeEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { recordedAt: 'asc' },
        select: { employeeId: true, type: true, status: true, recordedAt: true }
      }),
      prisma.employee.count({ where: { active: true, ...employeeWhere } })
    ]);
    const dayCount = Math.max(
      1,
      Math.floor(
        (this.endOfDay(endDate).getTime() - this.startOfDay(startDate).getTime()) / 86_400_000
      ) + 1
    );
    const series = new Map<
      string,
      {
        date: string;
        checkIns: number;
        checkOuts: number;
        late: number;
        earlyDeparture: number;
        present: number;
      }
    >();
    for (let offset = 0; offset < dayCount; offset += 1) {
      const date = new Date(this.startOfDay(startDate));
      date.setDate(date.getDate() + offset);
      const key = this.dateKey(date);
      series.set(key, {
        date: key,
        checkIns: 0,
        checkOuts: 0,
        late: 0,
        earlyDeparture: 0,
        present: 0
      });
    }
    const presentByDay = new Map<string, Set<string>>();
    const openChecks = new Map<string, Date>();
    let workedMinutes = 0;
    for (const record of records) {
      const day = series.get(this.dateKey(record.recordedAt));
      if (!day) continue;
      if (record.type === 'CHECK_IN') {
        day.checkIns += 1;
        if (record.status === 'LATE') day.late += 1;
        const present = presentByDay.get(day.date) ?? new Set<string>();
        present.add(record.employeeId);
        presentByDay.set(day.date, present);
        openChecks.set(record.employeeId, record.recordedAt);
      } else {
        day.checkOuts += 1;
        if (record.status === 'EARLY_DEPARTURE') day.earlyDeparture += 1;
        const checkIn = openChecks.get(record.employeeId);
        if (checkIn) {
          workedMinutes += Math.max(0, (record.recordedAt.getTime() - checkIn.getTime()) / 60_000);
          openChecks.delete(record.employeeId);
        }
      }
    }
    for (const [date, present] of presentByDay) {
      const day = series.get(date);
      if (day) day.present = present.size;
    }
    const entries = records.filter((record) => record.type === 'CHECK_IN').length;
    const late = records.filter(
      (record) => record.type === 'CHECK_IN' && record.status === 'LATE'
    ).length;
    const checkOuts = records.filter((record) => record.type === 'CHECK_OUT').length;
    const daysWithPresence = presentByDay.size;
    const totalPresent = [...presentByDay.values()].reduce(
      (total, current) => total + current.size,
      0
    );
    return {
      range: { startDate, endDate, days: dayCount },
      totals: {
        checkIns: entries,
        checkOuts,
        late,
        earlyDepartures: records.filter(
          (record) => record.type === 'CHECK_OUT' && record.status === 'EARLY_DEPARTURE'
        ).length,
        workedHours: Number((workedMinutes / 60).toFixed(2)),
        absences: Math.max(0, activeEmployees * dayCount - totalPresent)
      },
      kpis: {
        attendanceRate:
          activeEmployees && dayCount
            ? Number(((totalPresent / (activeEmployees * dayCount)) * 100).toFixed(2))
            : 0,
        punctualityRate: entries ? Number((((entries - late) / entries) * 100).toFixed(2)) : 0,
        averageHoursPerPresentEmployee: totalPresent
          ? Number((workedMinutes / 60 / totalPresent).toFixed(2))
          : 0,
        activeEmployees,
        daysWithPresence
      },
      series: [...series.values()]
    };
  }

  async calendar(
    startDate: Date,
    endDate: Date,
    filters: Pick<AttendanceFilters, 'companyId' | 'siteId' | 'departmentId' | 'employeeId'>
  ) {
    const employee = this.employeeWhere(filters);
    const attendanceWhere: Prisma.AttendanceWhereInput = {
      recordedAt: { gte: startDate, lte: endDate },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(Object.keys(employee).length ? { employee: { is: employee } } : {})
    };
    const leaveScope = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(Object.keys(employee).length ? { employee: { is: employee } } : {})
    };
    const [attendances, vacations, permissions, licenses, holidays, birthdayEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where: attendanceWhere,
        include: { employee: employeeSummary, site: { select: { name: true } } },
        orderBy: { recordedAt: 'asc' }
      }),
      prisma.vacation.findMany({
        where: { ...leaveScope, startDate: { lte: endDate }, endDate: { gte: startDate } },
        include: { employee: employeeSummary },
        orderBy: { startDate: 'asc' }
      }),
      prisma.workPermission.findMany({
        where: { ...leaveScope, startDate: { lte: endDate }, endDate: { gte: startDate } },
        include: { employee: employeeSummary },
        orderBy: { startDate: 'asc' }
      }),
      prisma.license.findMany({
        where: { ...leaveScope, startDate: { lte: endDate }, endDate: { gte: startDate } },
        include: { employee: employeeSummary },
        orderBy: { startDate: 'asc' }
      }),
      prisma.holiday.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(filters.companyId ? { companyId: filters.companyId } : {})
        },
        orderBy: { date: 'asc' }
      }),
      prisma.employee.findMany({
        where: {
          active: true,
          birthDate: { not: null },
          ...(filters.companyId ? { companyId: filters.companyId } : {}),
          ...(filters.siteId ? { siteId: filters.siteId } : {}),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.employeeId ? { id: filters.employeeId } : {})
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          department: { select: { name: true } },
          position: { select: { name: true } },
          site: { select: { name: true } }
        }
      })
    ]);

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const birthdayEvents: Array<{
      id: string;
      category: string;
      title: string;
      start: Date;
      end: Date;
      status: string;
      detail: string;
    }> = [];

    for (const emp of birthdayEmployees) {
      if (!emp.birthDate) continue;
      const bMonth = emp.birthDate.getUTCMonth();
      const bDay = emp.birthDate.getUTCDate();

      for (let y = startYear; y <= endYear; y++) {
        const bDate = new Date(Date.UTC(y, bMonth, bDay, 12, 0, 0, 0));
        if (bDate >= startDate && bDate <= endDate) {
          const detailParts = [emp.department?.name, emp.position?.name, emp.site?.name].filter(Boolean);
          birthdayEvents.push({
            id: `birthday:${emp.id}:${y}`,
            category: 'BIRTHDAY',
            title: `Cumpleaños - ${this.employeeName(emp)}`,
            start: bDate,
            end: bDate,
            status: 'CELEBRATION',
            detail: detailParts.length ? detailParts.join(' • ') : 'MSA Automotriz'
          });
        }
      }
    }

    return {
      events: [
        ...attendances.map((item) => ({
          id: `attendance:${item.id}`,
          category: 'ATTENDANCE',
          title: `${item.type === 'CHECK_IN' ? 'Entrada' : item.type === 'BREAK_OUT' ? 'Salida Refrigerio' : item.type === 'BREAK_IN' ? 'Retorno Refrigerio' : 'Salida'} - ${this.employeeName(item.employee)}`,
          start: item.recordedAt,
          end: item.recordedAt,
          status: item.status,
          detail: item.site.name
        })),
        ...vacations.map((item) => ({
          id: `vacation:${item.id}`,
          category: 'VACATION',
          title: `Vacaciones - ${this.employeeName(item.employee)}`,
          start: item.startDate,
          end: item.endDate,
          status: item.status,
          detail: item.reason ?? ''
        })),
        ...permissions.map((item) => ({
          id: `permission:${item.id}`,
          category: 'WORK_PERMISSION',
          title: `Permiso - ${this.employeeName(item.employee)}`,
          start: item.startDate,
          end: item.endDate,
          status: item.status,
          detail: item.reason
        })),
        ...licenses.map((item) => ({
          id: `license:${item.id}`,
          category: 'LICENSE',
          title: `${item.type} - ${this.employeeName(item.employee)}`,
          start: item.startDate,
          end: item.endDate,
          status: item.status,
          detail: item.reason ?? ''
        })),
        ...holidays.map((item) => ({
          id: `holiday:${item.id}`,
          category: 'HOLIDAY',
          title: item.name,
          start: item.date,
          end: item.date,
          status: 'APPROVED',
          detail: 'Feriado'
        })),
        ...birthdayEvents
      ]
    };
  }

  async issueOfflinePermit(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: {
        site: {
          select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true }
        }
      }
    });
    if (!employee?.active || !employee.site)
      throw new AppError(403, 'Empleado sin sede activa asignada');
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env.OFFLINE_ATTENDANCE_EXPIRATION_HOURS * 3_600_000);
    const permit = await prisma.offlineAttendanceToken.create({
      data: { userId, siteId: employee.site.id, tokenHash: hashToken(token), expiresAt }
    });
    return {
      id: permit.id,
      token,
      expiresAt,
      site: employee.site
    };
  }

  async synchronizeOfflineAttendance(
    userId: string,
    input: OfflineAttendanceInput,
    meta: AttendanceMeta
  ) {
    const offlinePermit = await prisma.offlineAttendanceToken.findUnique({
      where: { tokenHash: hashToken(input.offlineToken) }
    });
    const now = new Date();
    if (
      !offlinePermit ||
      offlinePermit.userId !== userId ||
      offlinePermit.usedAt ||
      offlinePermit.expiresAt <= now
    )
      throw new AppError(422, 'Permiso offline inválido, vencido o ya utilizado');
    if (
      input.recordedAt > new Date(now.getTime() + 5 * 60_000) ||
      input.recordedAt < new Date(offlinePermit.createdAt.getTime() - 5 * 60_000)
    )
      throw new AppError(422, 'La hora del registro offline no es válida');

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { site: true, schedule: true, company: { select: { id: true, timeZone: true } } }
    });
    if (!employee?.active)
      throw new AppError(403, 'Empleado inactivo o sin sede activa asignada');

    const activeSites = await prisma.site.findMany({
      where: {
        companyId: employee.companyId,
        active: true
      }
    });

    const candidateSites =
      activeSites.length > 0 ? activeSites : employee.site?.active ? [employee.site] : [];

    if (candidateSites.length === 0)
      throw new AppError(403, 'Empleado sin sede activa asignada');

    const evaluatedSites = candidateSites.map((candidate) => {
      const dist = haversineMeters(
        input.latitude,
        input.longitude,
        Number(candidate.latitude),
        Number(candidate.longitude)
      );
      return {
        site: candidate,
        distanceMeters: dist,
        isInside: dist <= (candidate.radiusMeters + 150)
      };
    });

    evaluatedSites.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const matched = evaluatedSites.find((item) => item.isInside);
    if (!matched)
      throw new AppError(403, 'No se encuentra dentro del área autorizada de ninguna sede.');

    const matchedSite = matched.site;
    const distanceMeters = matched.distanceMeters;

    const lastAttendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, recordedAt: true }
    });

    let lastBreakOutAt: Date | null = null;
    const effectiveBreakMinutes = getEffectiveBreakMinutesForToday(
      employee.schedule,
      input.recordedAt,
      employee.company.timeZone
    );

    if (!lastAttendance || lastAttendance.type === 'CHECK_OUT') {
      if (input.type !== 'CHECK_IN') {
        throw new AppError(
          400,
          'Primero debe registrar su Entrada antes de cualquier otro movimiento.'
        );
      }
    } else if (lastAttendance.type === 'CHECK_IN') {
      if (input.type === 'CHECK_IN') {
        throw new AppError(
          400,
          effectiveBreakMinutes > 0
            ? 'Ya cuenta con una Entrada registrada. Su siguiente marcación debe ser Salida a Refrigerio.'
            : 'Ya cuenta con una Entrada registrada. Su siguiente marcación debe ser Salida de la jornada.'
        );
      }
      if (input.type === 'BREAK_IN') {
        throw new AppError(
          400,
          'Debe registrar primero su Salida a Refrigerio antes del Retorno.'
        );
      }
      if (input.type === 'CHECK_OUT' && effectiveBreakMinutes > 0) {
        throw new AppError(
          400,
          'Debe registrar su período de Refrigerio (Salida y Retorno) antes de marcar su Salida de la jornada.'
        );
      }
    } else if (lastAttendance.type === 'BREAK_OUT') {
      lastBreakOutAt = lastAttendance.recordedAt;
      if (input.type !== 'BREAK_IN') {
        throw new AppError(
          400,
          'Se encuentra en tiempo de refrigerio. Su siguiente marcación obligatoria es Retorno de Refrigerio.'
        );
      }
    } else if (lastAttendance.type === 'BREAK_IN') {
      if (input.type !== 'CHECK_OUT') {
        throw new AppError(
          400,
          'Ya completó su Entrada y Refrigerio. Su siguiente marcación debe ser Salida de la jornada.'
        );
      }
    }

    const deviceMeta = parseUserAgent(meta.userAgent);
    const evaluation = determineAttendanceStatus(
      input.type,
      employee.schedule,
      input.recordedAt,
      employee.company.timeZone,
      lastBreakOutAt
    );
    return prisma.$transaction(async (transaction) => {
      if (input.deviceFingerprint) {
        const device = await transaction.device.upsert({
          where: { userId_fingerprint: { userId, fingerprint: input.deviceFingerprint } },
          create: {
            userId,
            fingerprint: input.deviceFingerprint,
            name: deviceMeta.device,
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
            status: 'PENDING'
          },
          update: {
            name: deviceMeta.device,
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
            lastSeenAt: now
          }
        });
        if (device.status === 'BLOCKED')
          throw new AppError(403, 'Este dispositivo está bloqueado para registrar asistencia');
      }
      const consumed = await transaction.offlineAttendanceToken.updateMany({
        where: { id: offlinePermit.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now }
      });
      if (!consumed.count) throw new AppError(422, 'Permiso offline ya utilizado o vencido');
      return transaction.attendance.create({
        data: {
          employeeId: employee.id,
          siteId: matchedSite.id,
          type: input.type,
          status: evaluation.status,
          excessMinutes: evaluation.excessMinutes,
          recordedAt: input.recordedAt,
          latitude: input.latitude,
          longitude: input.longitude,
          distanceMeters,
          approximateAddress: input.approximateAddress,
          connectionType: input.connectionType,
          ipAddress: meta.ip,
          browser: deviceMeta.browser,
          operatingSystem: deviceMeta.operatingSystem,
          device: deviceMeta.device
        }
      });
    });
  }

  private attendanceWhere(filters: AttendanceFilters): Prisma.AttendanceWhereInput {
    const employee = this.employeeWhere(filters);
    const recordedAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {})
    };
    return {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(Object.keys(recordedAt).length ? { recordedAt } : {}),
      ...(Object.keys(employee).length ? { employee: { is: employee } } : {})
    };
  }

  private employeeWhere(
    filters: Pick<AttendanceFilters, 'companyId' | 'departmentId' | 'employeeId' | 'search'>
  ): Prisma.EmployeeWhereInput {
    return {
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.search
        ? {
          OR: [
            { employeeCode: { contains: filters.search } },
            { user: { is: { firstName: { contains: filters.search } } } },
            { user: { is: { lastName: { contains: filters.search } } } },
            { user: { is: { email: { contains: filters.search } } } }
          ]
        }
        : {})
    };
  }

  private employeeName(employee: { user: { firstName: string; lastName: string } }) {
    return `${employee.user.firstName} ${employee.user.lastName}`.trim();
  }

  private startOfDay(value: Date) {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private endOfDay(value: Date) {
    const result = new Date(value);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private daysBefore(value: Date, days: number) {
    const result = new Date(value);
    result.setDate(result.getDate() - days);
    return result;
  }

  private dateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
