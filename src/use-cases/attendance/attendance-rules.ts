import { AttendanceStatus, ScheduleType } from '@prisma/client';
import type { AttendanceType, Schedule } from '@prisma/client';

export const determineAttendanceStatus = (
  type: AttendanceType,
  schedule: Pick<
    Schedule,
    'startTime' | 'endTime' | 'toleranceMinutes' | 'flexibleWindowMinutes' | 'type'
  > | null,
  recordedAt: Date,
  timeZone: string
) => {
  if (!schedule) return AttendanceStatus.ON_TIME;
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  if (startMinutes === null || endMinutes === null) return AttendanceStatus.ON_TIME;

  const actualMinutes = minutesInTimeZone(recordedAt, timeZone);
  const isNightSchedule = endMinutes <= startMinutes;
  const relativeActual =
    isNightSchedule && actualMinutes < startMinutes ? actualMinutes + 24 * 60 : actualMinutes;
  const relativeEnd = isNightSchedule ? endMinutes + 24 * 60 : endMinutes;
  const flexibility = schedule.type === ScheduleType.FLEXIBLE ? schedule.flexibleWindowMinutes : 0;
  const permittedVariance = schedule.toleranceMinutes + flexibility;

  if (type === 'CHECK_IN')
    return relativeActual > startMinutes + permittedVariance
      ? AttendanceStatus.LATE
      : AttendanceStatus.ON_TIME;
  return relativeActual < relativeEnd - permittedVariance
    ? AttendanceStatus.EARLY_DEPARTURE
    : AttendanceStatus.ON_TIME;
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
