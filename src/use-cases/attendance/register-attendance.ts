import type { AttendanceType } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashToken, haversineMeters } from '../../utils/crypto.js';
import { determineAttendanceStatus } from './attendance-rules.js';
import { parseUserAgent } from '../../utils/user-agent.js';

type AttendanceInput = { qrToken: string; latitude: number; longitude: number; type: AttendanceType; approximateAddress?: string; connectionType?: string; deviceFingerprint?: string };
type RequestMeta = { ip?: string; userAgent?: string; browser?: string; operatingSystem?: string; device?: string };

export class RegisterAttendance {
  async execute(userId: string, input: AttendanceInput, meta: RequestMeta) {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { site: true, schedule: true, company: { select: { timeZone: true } } }
    });
    if (!employee?.site || !employee.active) throw new AppError(403, 'Empleado sin sede activa asignada');
    const site = employee.site;
    const qr = await prisma.qrToken.findUnique({ where: { tokenHash: hashToken(input.qrToken) } });
    if (!qr || qr.siteId !== employee.siteId || qr.usedAt || qr.expiresAt <= new Date()) throw new AppError(422, 'Código QR inválido, expirado o ya utilizado');
    const distanceMeters = haversineMeters(input.latitude, input.longitude, site.latitude, site.longitude);
    if (distanceMeters > site.radiusMeters) throw new AppError(403, 'No se encuentra dentro del área autorizada.');
    const recordedAt = new Date();
    const deviceMeta = parseUserAgent(meta.userAgent ?? meta.browser);
    const status = determineAttendanceStatus(input.type, employee.schedule, recordedAt, employee.company.timeZone);
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
          update: { userAgent: meta.userAgent, ipAddress: meta.ip, name: deviceMeta.device, lastSeenAt: recordedAt }
        });
        if (device.status === 'BLOCKED') throw new AppError(403, 'Este dispositivo está bloqueado para registrar asistencia');
      }
      await tx.qrToken.update({ where: { id: qr.id }, data: { usedAt: new Date() } });
      return tx.attendance.create({
        data: {
          employeeId: employee.id,
          siteId: site.id,
          qrTokenId: qr.id,
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