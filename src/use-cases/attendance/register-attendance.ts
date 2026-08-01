import { AttendanceStatus } from '@prisma/client';
import type { AttendanceType } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashToken, haversineMeters } from '../../utils/crypto.js';

type AttendanceInput = { qrToken: string; latitude: number; longitude: number; type: AttendanceType; approximateAddress?: string; connectionType?: string };
type RequestMeta = { ip?: string; browser?: string; operatingSystem?: string; device?: string };

export class RegisterAttendance {
  async execute(userId: string, input: AttendanceInput, meta: RequestMeta) {
    const employee = await prisma.employee.findUnique({ where: { userId }, include: { site: true } });
    if (!employee?.site || !employee.active) throw new AppError(403, 'Empleado sin sede activa asignada');
    const site = employee.site;
    const qr = await prisma.qrToken.findUnique({ where: { tokenHash: hashToken(input.qrToken) } });
    if (!qr || qr.siteId !== employee.siteId || qr.usedAt || qr.expiresAt <= new Date()) throw new AppError(422, 'Código QR inválido, expirado o ya utilizado');
    const distanceMeters = haversineMeters(input.latitude, input.longitude, site.latitude, site.longitude);
    if (distanceMeters > site.radiusMeters) throw new AppError(403, 'No se encuentra dentro del área autorizada.');
    const attendance = await prisma.$transaction(async (tx) => {
      await tx.qrToken.update({ where: { id: qr.id }, data: { usedAt: new Date() } });
      return tx.attendance.create({ data: { employeeId: employee.id, siteId: site.id, qrTokenId: qr.id, type: input.type, status: AttendanceStatus.ON_TIME, latitude: input.latitude, longitude: input.longitude, distanceMeters, approximateAddress: input.approximateAddress, connectionType: input.connectionType, ipAddress: meta.ip, browser: meta.browser, operatingSystem: meta.operatingSystem, device: meta.device } });
    });
    return attendance;
  }
}