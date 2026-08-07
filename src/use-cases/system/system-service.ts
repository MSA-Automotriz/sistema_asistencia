import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';

export type SystemLogKind = 'error' | 'combined';

export class SystemService {
  async status() {
    const startedAt = process.uptime();
    let database = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unavailable';
    }
    const [users, activeEmployees, pendingRequests, unreadNotifications] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count({ where: { active: true } }),
      Promise.all([
        prisma.vacation.count({ where: { status: 'PENDING' } }),
        prisma.license.count({ where: { status: 'PENDING' } }),
        prisma.workPermission.count({ where: { status: 'PENDING' } }),
        prisma.overtimeRequest.count({ where: { status: 'PENDING' } })
      ]).then((counts) => counts.reduce((total, count) => total + count, 0)),
      prisma.notification.count({ where: { readAt: null } })
    ]);
    return {
      application: env.APP_NAME,
      environment: env.NODE_ENV,
      database,
      uptimeSeconds: Math.floor(startedAt),
      generatedAt: new Date(),
      metrics: { users, activeEmployees, pendingRequests, unreadNotifications }
    };
  }

  async logs(kind: SystemLogKind, limit: number) {
    const logPath = path.resolve('logs', kind === 'error' ? 'error.log' : 'combined.log');
    try {
      const content = await readFile(logPath, 'utf8');
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return { message: line };
          }
        });
    } catch {
      return [];
    }
  }

  async cleanExpiredData(retentionDays: number) {
    const before = new Date(Date.now() - retentionDays * 86_400_000);
    const now = new Date();
    const [audit, sessions, qrTokens, offlineTokens, passwordTokens] = await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: before } } }),
      prisma.session.deleteMany({ where: { expiresAt: { lt: before } } }),
      prisma.qrToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.offlineAttendanceToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } })
    ]);
    return {
      auditLogs: audit.count,
      sessions: sessions.count,
      qrTokens: qrTokens.count,
      offlineTokens: offlineTokens.count,
      passwordTokens: passwordTokens.count
    };
  }

  async analyzeDatabase() {
    const tables = ['Attendance', 'Employee', 'Session', 'AuditLog', 'Notification'];
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          await prisma.$executeRawUnsafe(`ANALYZE TABLE \`${table}\``);
          return { table, status: 'analyzed' };
        } catch (error) {
          return {
            table,
            status: 'unavailable',
            message: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
      })
    );
    return { results };
  }
}
