import { AttendanceStatus } from '@prisma/client';
import type { AttendanceType, Schedule } from '@prisma/client';
export type AttendanceEvaluation = {
    status: AttendanceStatus;
    excessMinutes?: number | null;
};
export declare const determineAttendanceStatus: (type: AttendanceType, schedule: Pick<Schedule, "startTime" | "endTime" | "toleranceMinutes" | "flexibleWindowMinutes" | "type" | "breakMinutes"> | null, recordedAt: Date, timeZone: string, lastBreakOutAt?: Date | null) => AttendanceEvaluation;
