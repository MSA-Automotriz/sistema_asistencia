import type { AttendanceType } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { haversineMeters } from '../../utils/crypto.js';
import { determineAttendanceStatus } from './attendance-rules.js';
import { parseUserAgent } from '../../utils/user-agent.js';

type AttendanceInput = {
  latitude: number;
  longitude: number;
  type: AttendanceType;
  approximateAddress?: string;
  connectionType?: string;
  deviceFingerprint?: string;
};
type RequestMeta = {
  ip?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  device?: string;
};

export class RegisterAttendance {
  async execute(userId: string, input: AttendanceInput, meta: RequestMeta) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { site: true, schedule: true, company: { select: { timeZone: true } } }
    });
    if (!employee?.site || !employee.active)
      throw new AppError(403, 'Empleado sin sede activa asignada');
    const site = employee.site;
    const distanceMeters = haversineMeters(
      input.latitude,
      input.longitude,
      site.latitude,
      site.longitude
    );
    const toleranceMeters = site.radiusMeters;
    if (distanceMeters > toleranceMeters) {
      throw new AppError(
        403,
        `No se encuentra dentro del área autorizada (${Math.round(distanceMeters)} m calculados, máximo permitido ${toleranceMeters} m).`
      );
    }

    const lastAttendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, recordedAt: true }
    });

    if (input.type === 'CHECK_IN' && lastAttendance?.type === 'CHECK_IN') {
      throw new AppError(
        400,
        'Ya cuenta con una Entrada registrada sin Salida. Debe registrar su Salida antes de volver a ingresar.'
      );
    }

    if (input.type === 'CHECK_OUT' && (!lastAttendance || lastAttendance.type === 'CHECK_OUT')) {
      throw new AppError(
        400,
        'No puede registrar una Salida sin contar con un registro de Entrada previo activo.'
      );
    }

    const recordedAt = new Date();
    const deviceMeta = parseUserAgent(meta.userAgent ?? meta.browser);
    const status = determineAttendanceStatus(
      input.type,
      employee.schedule,
      recordedAt,
      employee.company.timeZone
    );
    const attendance = await prisma.$transaction(async (tx) => {
      if (input.deviceFingerprint) {
        const device = await tx.device.upsert({
          where: { userId_fingerprint: { userId, fingerprint: input.deviceFingerprint } },
          create: {
            userId,
            fingerprint: input.deviceFingerprint,
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
            name: deviceMeta.device,
            status: 'PENDING'
          },
          update: {
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
            name: deviceMeta.device,
            lastSeenAt: recordedAt
          }
        });
        if (device.status === 'BLOCKED')
          throw new AppError(403, 'Este dispositivo está bloqueado para registrar asistencia');
      }
      return tx.attendance.create({
        data: {
          employeeId: employee.id,
          siteId: site.id,
          type: input.type,
          status,
          recordedAt,
          latitude: input.latitude,
          longitude: input.longitude,
          distanceMeters,
          approximateAddress: input.approximateAddress,
          connectionType: input.connectionType,
          ipAddress: meta.ip,
          browser: deviceMeta.browser ?? meta.browser,
          operatingSystem: deviceMeta.operatingSystem ?? meta.operatingSystem,
          device: deviceMeta.device ?? meta.device
        }
      });
    });
    return attendance;
  }
}
