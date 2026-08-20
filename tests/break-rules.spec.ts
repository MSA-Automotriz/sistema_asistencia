import { describe, it, expect } from 'vitest';
import { determineAttendanceStatus } from '../src/use-cases/attendance/attendance-rules.js';
import { ScheduleType, AttendanceStatus } from '@prisma/client';

describe('Break / Lunch Rules and Sequential Status Determination', () => {
  const schedule = {
    startTime: '08:00',
    endTime: '17:00',
    toleranceMinutes: 15,
    flexibleWindowMinutes: 0,
    type: ScheduleType.NORMAL,
    breakMinutes: 60
  };
  const timeZone = 'America/Lima';

  it('determines ON_TIME for break out', () => {
    const recordedAt = new Date('2026-08-20T13:00:00.000Z');
    const result = determineAttendanceStatus('BREAK_OUT', schedule, recordedAt, timeZone);
    expect(result.status).toBe(AttendanceStatus.ON_TIME);
    expect(result.excessMinutes).toBeNull();
  });

  it('determines ON_TIME for break in within 60 min + tolerance', () => {
    const breakOutAt = new Date('2026-08-20T13:00:00.000Z');
    const breakInAt = new Date('2026-08-20T14:10:00.000Z'); // 70 min (within 60 + 15 min tolerance)
    const result = determineAttendanceStatus('BREAK_IN', schedule, breakInAt, timeZone, breakOutAt);
    expect(result.status).toBe(AttendanceStatus.ON_TIME);
    expect(result.excessMinutes).toBe(0);
  });

  it('determines LATE for break in exceeding breakMinutes + tolerance', () => {
    const breakOutAt = new Date('2026-08-20T13:00:00.000Z');
    const breakInAt = new Date('2026-08-20T14:30:00.000Z'); // 90 min (exceeds 60 + 15 by 30 min)
    const result = determineAttendanceStatus('BREAK_IN', schedule, breakInAt, timeZone, breakOutAt);
    expect(result.status).toBe(AttendanceStatus.LATE);
    expect(result.excessMinutes).toBe(30);
  });
});
