import { prisma } from '../../database/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { haversineMeters } from '../../utils/crypto.js';
import { determineAttendanceStatus } from './attendance-rules.js';
import { parseUserAgent } from '../../utils/user-agent.js';
export class RegisterAttendance {
    async execute(userId, input, meta) {
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
        const candidateSites = activeSites.length > 0 ? activeSites : employee.site?.active ? [employee.site] : [];
        if (candidateSites.length === 0) {
            throw new AppError(403, 'No hay sedes activas autorizadas para registrar asistencia.');
        }
        const evaluatedSites = candidateSites.map((candidate) => {
            const dist = haversineMeters(input.latitude, input.longitude, Number(candidate.latitude), Number(candidate.longitude));
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
            throw new AppError(403, `No se encuentra dentro del área autorizada de ninguna sede activa (${distRounded} m calculados a "${nearest.site.name}", máximo permitido ${nearest.site.radiusMeters} m).`);
        }
        const matchedSite = matched.site;
        const distanceMeters = matched.distanceMeters;
        const recordedAt = new Date();
        // Evitar doble registro accidental del mismo tipo en menos de 15 segundos
        const recentDuplicate = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                type: input.type,
                recordedAt: {
                    gte: new Date(recordedAt.getTime() - 15 * 1000)
                }
            }
        });
        if (recentDuplicate) {
            const typeLabel = input.type === 'CHECK_IN'
                ? 'Entrada'
                : input.type === 'BREAK_OUT'
                    ? 'Salida a Refrigerio'
                    : input.type === 'BREAK_IN'
                        ? 'Retorno de Refrigerio'
                        : 'Salida';
            throw new AppError(400, `Ya registró su ${typeLabel} hace unos segundos.`);
        }
        let lastBreakOutAt = null;
        if (input.type === 'BREAK_IN') {
            // Buscar la salida a refrigerio más reciente dentro de las últimas 12 horas
            const recentBreakOut = await prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    type: 'BREAK_OUT',
                    recordedAt: {
                        gte: new Date(recordedAt.getTime() - 12 * 60 * 60 * 1000)
                    }
                },
                orderBy: { recordedAt: 'desc' },
                select: { recordedAt: true }
            });
            if (recentBreakOut) {
                lastBreakOutAt = recentBreakOut.recordedAt;
            }
        }
        const deviceMeta = parseUserAgent(meta.userAgent ?? meta.browser);
        const evaluation = determineAttendanceStatus(input.type, employee.schedule, recordedAt, employee.company.timeZone, lastBreakOutAt);
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
//# sourceMappingURL=register-attendance.js.map