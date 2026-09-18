import { AttendanceStatus, ScheduleType } from '@prisma/client';
import type { AttendanceType, Schedule } from '@prisma/client';

export type AttendanceEvaluation = {
  status: AttendanceStatus;
  excessMinutes?: number | null;
};

export type ShiftConfig = {
  name?: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
};

export type SaturdayScheduleConfig = {
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  isRotating?: boolean;
  shifts?: ShiftConfig[];
};

export type WorkDaysConfig = {
  days?: number[];
  saturday?: SaturdayScheduleConfig;
};

export const parseWorkDaysConfig = (workDays: unknown): WorkDaysConfig | null => {
  if (!workDays) return null;
  if (typeof workDays === 'string') {
    try {
      const parsed = JSON.parse(workDays);
      if (Array.isArray(parsed)) return { days: parsed };
      if (typeof parsed === 'object' && parsed !== null) return parsed as WorkDaysConfig;
    } catch {
      return null;
    }
  }
  if (Array.isArray(workDays)) {
    return { days: workDays as number[] };
  }
  if (typeof workDays === 'object' && workDays !== null) {
    return workDays as WorkDaysConfig;
  }
  return null;
};

export const getDayOfWeekInTimeZone = (date: Date, timeZone: string): number => {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return dayMap[dayName] ?? date.getDay();
};

export const resolveEffectiveDaySchedule = (
  schedule: Pick<Schedule, 'startTime' | 'endTime' | 'breakMinutes'> & { workDays?: unknown },
  type: AttendanceType,
  recordedAt: Date,
  timeZone: string
): { startTime: string; endTime: string; breakMinutes: number } => {
  const dayOfWeek = getDayOfWeekInTimeZone(recordedAt, timeZone);
  const workDaysConfig = parseWorkDaysConfig(schedule.workDays);

  if (dayOfWeek === 6 && workDaysConfig?.saturday) {
    const sat = workDaysConfig.saturday;
    if (sat.isRotating && Array.isArray(sat.shifts) && sat.shifts.length > 0) {
      if (sat.shifts.length === 1) {
        return {
          startTime: sat.shifts[0].startTime,
          endTime: sat.shifts[0].endTime,
          breakMinutes: sat.shifts[0].breakMinutes ?? 0
        };
      }
      const actualMinutes = minutesInTimeZone(recordedAt, timeZone);
      if (type === 'CHECK_IN') {
        const start1 = timeToMinutes(sat.shifts[0].startTime) ?? 510;
        const start2 = timeToMinutes(sat.shifts[1].startTime) ?? 750;
        const threshold = Math.floor((start1 + start2) / 2);
        const chosen = actualMinutes < threshold ? sat.shifts[0] : sat.shifts[1];
        return {
          startTime: chosen.startTime,
          endTime: chosen.endTime,
          breakMinutes: chosen.breakMinutes ?? 0
        };
      }
      if (type === 'CHECK_OUT') {
        const end1 = timeToMinutes(sat.shifts[0].endTime) ?? 840;
        const end2 = timeToMinutes(sat.shifts[1].endTime) ?? 1080;
        const threshold = Math.floor((end1 + end2) / 2);
        const chosen = actualMinutes < threshold ? sat.shifts[0] : sat.shifts[1];
        return {
          startTime: chosen.startTime,
          endTime: chosen.endTime,
          breakMinutes: chosen.breakMinutes ?? 0
        };
      }
      return {
        startTime: sat.shifts[0].startTime,
        endTime: sat.shifts[0].endTime,
        breakMinutes: sat.shifts[0].breakMinutes ?? 0
      };
    }
    if (sat.startTime && sat.endTime) {
      return {
        startTime: sat.startTime,
        endTime: sat.endTime,
        breakMinutes: sat.breakMinutes ?? 0
      };
    }
  }

  return {
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakMinutes: schedule.breakMinutes && schedule.breakMinutes > 0 ? schedule.breakMinutes : 0
  };
};

export const getEffectiveBreakMinutesForToday = (
  schedule: (Pick<Schedule, 'startTime' | 'endTime' | 'breakMinutes'> & { workDays?: unknown }) | null,
  recordedAt: Date,
  timeZone: string
): number => {
  if (!schedule) return 0;
  const effective = resolveEffectiveDaySchedule(schedule, 'CHECK_IN', recordedAt, timeZone);
  return effective.breakMinutes;
};

export const determineAttendanceStatus = (
  type: AttendanceType,
  schedule:
    | (Pick<
        Schedule,
        'startTime' | 'endTime' | 'toleranceMinutes' | 'flexibleWindowMinutes' | 'type' | 'breakMinutes'
      > & { workDays?: unknown })
    | null,
  recordedAt: Date,
  timeZone: string,
  lastBreakOutAt?: Date | null
): AttendanceEvaluation => {
  if (!schedule) return { status: AttendanceStatus.ON_TIME, excessMinutes: null };

  if (type === 'BREAK_OUT') {
    return { status: AttendanceStatus.ON_TIME, excessMinutes: null };
  }

  const effectiveSchedule = resolveEffectiveDaySchedule(schedule, type, recordedAt, timeZone);

  if (type === 'BREAK_IN') {
    const allowedMinutes =
      effectiveSchedule.breakMinutes > 0
        ? effectiveSchedule.breakMinutes
        : schedule.breakMinutes && schedule.breakMinutes > 0
          ? schedule.breakMinutes
          : 60;
    const tolerance = schedule.toleranceMinutes || 0;
    if (lastBreakOutAt) {
      const elapsedMinutes = Math.max(
        0,
        Math.floor((recordedAt.getTime() - lastBreakOutAt.getTime()) / 60_000)
      );
      if (elapsedMinutes > allowedMinutes + tolerance) {
        const excessMinutes = elapsedMinutes - allowedMinutes;
        return { status: AttendanceStatus.LATE, excessMinutes };
      }
    }
    return { status: AttendanceStatus.ON_TIME, excessMinutes: 0 };
  }

  const startMinutes = timeToMinutes(effectiveSchedule.startTime);
  const endMinutes = timeToMinutes(effectiveSchedule.endTime);
  if (startMinutes === null || endMinutes === null)
    return { status: AttendanceStatus.ON_TIME, excessMinutes: null };

  const actualMinutes = minutesInTimeZone(recordedAt, timeZone);
  const isNightSchedule = endMinutes <= startMinutes;
  const relativeActual =
    isNightSchedule && actualMinutes < startMinutes ? actualMinutes + 24 * 60 : actualMinutes;
  const relativeEnd = isNightSchedule ? endMinutes + 24 * 60 : endMinutes;
  const flexibility = schedule.type === ScheduleType.FLEXIBLE ? schedule.flexibleWindowMinutes : 0;
  const permittedVariance = schedule.toleranceMinutes + flexibility;

  if (type === 'CHECK_IN') {
    const isLate = relativeActual > startMinutes + permittedVariance;
    return {
      status: isLate ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
      excessMinutes: isLate ? relativeActual - startMinutes : null
    };
  }

  const isEarly = relativeActual < relativeEnd - permittedVariance;
  return {
    status: isEarly ? AttendanceStatus.EARLY_DEPARTURE : AttendanceStatus.ON_TIME,
    excessMinutes: null
  };
};

export const timeToMinutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const minutesInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minutes = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hours * 60 + minutes;
};
