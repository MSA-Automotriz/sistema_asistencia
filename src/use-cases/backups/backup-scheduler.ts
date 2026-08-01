import { BackupType } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
import { BackupService, type BackupSchedule } from './backup-service.js';

type CompanyTime = {
  hour: number;
  minute: number;
  dayOfWeek: number;
};

const weekdayByName: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export class BackupScheduler {
  private readonly executedSlots = new Map<string, number>();
  private readonly backups = new BackupService();
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  start() {
    void this.runDueSchedules();
    this.timer = setInterval(() => void this.runDueSchedules(), 30_000);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runDueSchedules(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const settings = await prisma.setting.findMany({
        where: { key: 'backup.schedule' },
        select: { companyId: true, value: true, company: { select: { timeZone: true } } }
      });
      for (const setting of settings) {
        const schedule = this.parseSchedule(setting.value);
        if (!schedule?.enabled) continue;
        const companyTime = this.timeForCompany(now, setting.company.timeZone);
        if (schedule.hour !== companyTime.hour || schedule.minute !== companyTime.minute) continue;
        if (schedule.frequency === 'WEEKLY' && (schedule.dayOfWeek ?? 1) !== companyTime.dayOfWeek)
          continue;

        const slot = `${setting.companyId}:${companyTime.dayOfWeek}:${companyTime.hour}:${companyTime.minute}:${now.toISOString().slice(0, 10)}`;
        if (this.executedSlots.has(slot)) continue;
        this.executedSlots.set(slot, now.getTime());
        try {
          await this.backups.start(setting.companyId, schedule.type);
          logger.info('Respaldo programado iniciado', {
            companyId: setting.companyId,
            type: schedule.type,
            frequency: schedule.frequency
          });
        } catch (error) {
          this.executedSlots.delete(slot);
          logger.error('No se pudo iniciar el respaldo programado', {
            companyId: setting.companyId,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      this.removeOldSlots(now.getTime());
    } catch (error) {
      logger.error('No se pudieron revisar las programaciones de respaldo', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      this.running = false;
    }
  }

  private parseSchedule(value: string): BackupSchedule | null {
    try {
      const candidate = JSON.parse(value) as Partial<BackupSchedule>;
      const hour = candidate.hour;
      const minute = candidate.minute;
      const dayOfWeek = candidate.dayOfWeek;
      if (
        typeof candidate.enabled !== 'boolean' ||
        (candidate.frequency !== 'DAILY' && candidate.frequency !== 'WEEKLY') ||
        typeof hour !== 'number' ||
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23 ||
        typeof minute !== 'number' ||
        !Number.isInteger(minute) ||
        minute < 0 ||
        minute > 59 ||
        (candidate.type !== BackupType.DATABASE && candidate.type !== BackupType.FILES)
      )
        return null;
      if (
        dayOfWeek !== undefined &&
        (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
      )
        return null;
      return candidate as BackupSchedule;
    } catch {
      return null;
    }
  }

  private timeForCompany(now: Date, timeZone: string): CompanyTime {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(now);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return {
        hour: Number(values.hour) % 24,
        minute: Number(values.minute),
        dayOfWeek: weekdayByName[values.weekday] ?? now.getDay()
      };
    } catch {
      return { hour: now.getHours(), minute: now.getMinutes(), dayOfWeek: now.getDay() };
    }
  }

  private removeOldSlots(now: number) {
    const expiration = now - 24 * 60 * 60 * 1_000;
    for (const [slot, executedAt] of this.executedSlots) {
      if (executedAt < expiration) this.executedSlots.delete(slot);
    }
  }
}
