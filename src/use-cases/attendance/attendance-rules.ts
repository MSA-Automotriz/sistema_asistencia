import { AttendanceStatus, ScheduleType } from '@prisma/client';
import type { AttendanceType, Schedule } from '@prisma/client';

export type AttendanceEvaluation = {
  status: AttendanceStatus;
  excessMinutes?: number | null;
};

export const determineAttendanceStatus = (
  type: AttendanceType,
  schedule: Pick<
    Schedule,
    'startTime' | 'endTime' | 'toleranceMinutes' | 'flexibleWindowMinutes' | 'type' | 'breakMinutes'
  > | null,
  recordedAt: Date,
  timeZone: string,
  lastBreakOutAt?: Date | null
): AttendanceEvaluation => {
  if (!schedule) return { status: AttendanceStatus.ON_TIME, excessMinutes: null };

  if (type === 'BREAK_OUT') {
    return { status: AttendanceStatus.ON_TIME, excessMinutes: null };
  }

  if (type === 'BREAK_IN') {
    const allowedMinutes =
      schedule.breakMinutes && schedule.breakMinutes > 0 ? schedule.breakMinutes : 60;
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

  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
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

const timeToMinutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const minutesInTimeZone = (date: Date, timeZone: string) => {
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
