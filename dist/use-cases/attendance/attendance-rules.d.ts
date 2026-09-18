import { AttendanceStatus } from '@prisma/client';
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
export declare const parseWorkDaysConfig: (workDays: unknown) => WorkDaysConfig | null;
export declare const getDayOfWeekInTimeZone: (date: Date, timeZone: string) => number;
export declare const resolveEffectiveDaySchedule: (schedule: Pick<Schedule, "startTime" | "endTime" | "breakMinutes"> & {
    workDays?: unknown;
}, type: AttendanceType, recordedAt: Date, timeZone: string) => {
    startTime: string;
    endTime: string;
    breakMinutes: number;
};
export declare const getEffectiveBreakMinutesForToday: (schedule: (Pick<Schedule, "startTime" | "endTime" | "breakMinutes"> & {
    workDays?: unknown;
}) | null, recordedAt: Date, timeZone: string) => number;
export declare const determineAttendanceStatus: (type: AttendanceType, schedule: (Pick<Schedule, "startTime" | "endTime" | "toleranceMinutes" | "flexibleWindowMinutes" | "type" | "breakMinutes"> & {
    workDays?: unknown;
}) | null, recordedAt: Date, timeZone: string, lastBreakOutAt?: Date | null) => AttendanceEvaluation;
export declare const timeToMinutes: (value: string) => number | null;
export declare const minutesInTimeZone: (date: Date, timeZone: string) => number;
