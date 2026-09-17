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
      include: { site: true, schedule: true, company: { select: { id: true, timeZone: true } } }
    });
    if (!employee || !employee.active)
      throw new AppError(403, 'Empleado sin sede activa o inactivo');

    const activeSites = await prisma.site.findMany({
      where: {
        companyId: employee.companyId,
        active: true
      }
    });

    const candidateSites =
      activeSites.length > 0 ? activeSites : employee.site?.active ? [employee.site] : [];

    if (candidateSites.length === 0) {
      throw new AppError(403, 'No hay sedes activas autorizadas para registrar asistencia.');
    }

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
        isInside: dist <= candidate.radiusMeters
      };
    });

    evaluatedSites.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const matched = evaluatedSites.find((item) => item.isInside);
    if (!matched) {
      const nearest = evaluatedSites[0];
      const distRounded = Math.round(nearest.distanceMeters);
      throw new AppError(
        403,
        `No se encuentra dentro del área autorizada de ninguna sede activa (${distRounded} m calculados a "${nearest.site.name}", máximo permitido ${nearest.site.radiusMeters} m).`
      );
    }

    const matchedSite = matched.site;
    const distanceMeters = matched.distanceMeters;

    const lastAttendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, recordedAt: true }
    });

    let lastBreakOutAt: Date | null = null;

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
          'Ya cuenta con una Entrada registrada. Su siguiente marcación debe ser Salida a Refrigerio.'
        );
      }
      if (input.type === 'BREAK_IN') {
        throw new AppError(
          400,
          'Debe registrar primero su Salida a Refrigerio antes del Retorno.'
        );
      }
      if (input.type === 'CHECK_OUT') {
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

    const recordedAt = new Date();
    const deviceMeta = parseUserAgent(meta.userAgent ?? meta.browser);
    const evaluation = determineAttendanceStatus(
      input.type,
      employee.schedule,
      recordedAt,
      employee.company.timeZone,
      lastBreakOutAt
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
          siteId: matchedSite.id,
          type: input.type,
          status: evaluation.status,
          excessMinutes: evaluation.excessMinutes,
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
