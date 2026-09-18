import { describe, it, expect } from 'vitest';
import {
  determineAttendanceStatus,
  getEffectiveBreakMinutesForToday
} from '../src/use-cases/attendance/attendance-rules.js';
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

describe('Saturday Schedules & Rotating Shifts for Sales Advisors', () => {
  const timeZone = 'America/Lima';

  // 2026-08-22 is a Saturday (Sábado)
  // 2026-08-21 is a Friday (Viernes)

  const salesAdvisorSchedule = {
    name: 'Comercial - Asesor de Ventas (Sáb. Rotativo)',
    startTime: '08:30',
    endTime: '19:00',
    toleranceMinutes: 10,
    flexibleWindowMinutes: 0,
    type: ScheduleType.ROTATING,
    breakMinutes: 120,
    workDays: {
      days: [1, 2, 3, 4, 5, 6],
      saturday: {
        isRotating: true,
        shifts: [
          { name: '1.er Turno', startTime: '08:30', endTime: '14:00', breakMinutes: 0 },
          { name: '2.º Turno', startTime: '12:30', endTime: '18:00', breakMinutes: 0 }
        ]
      }
    }
  };

  const regularGeneralSchedule = {
    name: 'General / Taller (2h Refrigerio)',
    startTime: '08:00',
    endTime: '18:30',
    toleranceMinutes: 10,
    flexibleWindowMinutes: 0,
    type: ScheduleType.NORMAL,
    breakMinutes: 120,
    workDays: {
      days: [1, 2, 3, 4, 5, 6],
      saturday: {
        startTime: '08:00',
        endTime: '13:30',
        breakMinutes: 0
      }
    }
  };

  it('evaluates Monday-Friday schedule normally for Sales Advisors (08:30 - 19:00)', () => {
    // Friday Aug 21, 2026 at 08:35 Lima time (13:35 UTC)
    const fridayOnTime = new Date('2026-08-21T13:35:00.000Z');
    const resOnTime = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, fridayOnTime, timeZone);
    expect(resOnTime.status).toBe(AttendanceStatus.ON_TIME);

    // Friday Aug 21, 2026 at 08:50 Lima time (13:50 UTC) -> Late by 20m (tolerance 10m)
    const fridayLate = new Date('2026-08-21T13:50:00.000Z');
    const resLate = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, fridayLate, timeZone);
    expect(resLate.status).toBe(AttendanceStatus.LATE);
    expect(resLate.excessMinutes).toBe(20);

    // Friday break is 120 min
    expect(getEffectiveBreakMinutesForToday(salesAdvisorSchedule, fridayOnTime, timeZone)).toBe(120);
  });

  it('evaluates Saturday Turno 1 (08:30 - 14:00) when arriving in morning window', () => {
    // Saturday Aug 22, 2026 at 08:25 Lima time (13:25 UTC)
    const satMorningOnTime = new Date('2026-08-22T13:25:00.000Z');
    const resOnTime = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, satMorningOnTime, timeZone);
    expect(resOnTime.status).toBe(AttendanceStatus.ON_TIME);

    // Saturday Aug 22, 2026 at 08:45 Lima time (13:45 UTC) -> Late for Turno 1 (08:30)
    const satMorningLate = new Date('2026-08-22T13:45:00.000Z');
    const resLate = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, satMorningLate, timeZone);
    expect(resLate.status).toBe(AttendanceStatus.LATE);
    expect(resLate.excessMinutes).toBe(15);

    // Saturday check out for Turno 1 (14:00) at 14:02 (19:02 UTC) -> ON_TIME
    const satTurno1CheckOut = new Date('2026-08-22T19:02:00.000Z');
    const resOut = determineAttendanceStatus('CHECK_OUT', salesAdvisorSchedule, satTurno1CheckOut, timeZone);
    expect(resOut.status).toBe(AttendanceStatus.ON_TIME);

    // Saturday break is 0 min
    expect(getEffectiveBreakMinutesForToday(salesAdvisorSchedule, satMorningOnTime, timeZone)).toBe(0);
  });

  it('evaluates Saturday Turno 2 (12:30 - 18:00) when arriving in afternoon window', () => {
    // Saturday Aug 22, 2026 at 12:28 Lima time (17:28 UTC)
    const satAfternoonOnTime = new Date('2026-08-22T17:28:00.000Z');
    const resOnTime = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, satAfternoonOnTime, timeZone);
    expect(resOnTime.status).toBe(AttendanceStatus.ON_TIME);

    // Saturday Aug 22, 2026 at 12:45 Lima time (17:45 UTC) -> Late for Turno 2 (12:30)
    const satAfternoonLate = new Date('2026-08-22T17:45:00.000Z');
    const resLate = determineAttendanceStatus('CHECK_IN', salesAdvisorSchedule, satAfternoonLate, timeZone);
    expect(resLate.status).toBe(AttendanceStatus.LATE);
    expect(resLate.excessMinutes).toBe(15);

    // Saturday check out for Turno 2 (18:00) at 18:05 (23:05 UTC) -> ON_TIME
    const satTurno2CheckOut = new Date('2026-08-22T23:05:00.000Z');
    const resOut = determineAttendanceStatus('CHECK_OUT', salesAdvisorSchedule, satTurno2CheckOut, timeZone);
    expect(resOut.status).toBe(AttendanceStatus.ON_TIME);
  });

  it('evaluates Regular General Schedule on Saturday (08:00 - 13:30, 0 break)', () => {
    // Saturday Aug 22, 2026 at 08:05 Lima time (13:05 UTC) -> ON_TIME
    const satCheckIn = new Date('2026-08-22T13:05:00.000Z');
    const resIn = determineAttendanceStatus('CHECK_IN', regularGeneralSchedule, satCheckIn, timeZone);
    expect(resIn.status).toBe(AttendanceStatus.ON_TIME);

    // Saturday check out at 13:30 Lima time (18:30 UTC) -> ON_TIME
    const satCheckOut = new Date('2026-08-22T18:30:00.000Z');
    const resOut = determineAttendanceStatus('CHECK_OUT', regularGeneralSchedule, satCheckOut, timeZone);
    expect(resOut.status).toBe(AttendanceStatus.ON_TIME);

    // Saturday check out early at 13:10 Lima time (18:10 UTC) -> EARLY_DEPARTURE (13:30 - 10m = 13:20)
    const satCheckOutEarly = new Date('2026-08-22T18:10:00.000Z');
    const resEarly = determineAttendanceStatus('CHECK_OUT', regularGeneralSchedule, satCheckOutEarly, timeZone);
    expect(resEarly.status).toBe(AttendanceStatus.EARLY_DEPARTURE);

    // Saturday break is 0 min
    expect(getEffectiveBreakMinutesForToday(regularGeneralSchedule, satCheckIn, timeZone)).toBe(0);
  });
});
