import type { AttendanceType } from '@prisma/client';
type AttendanceInput = {
    latitude: number;
    longitude: number;
    type: AttendanceType;
    approximateAddress?: string;
    connectionType?: string;
    deviceFingerprint?: string;
};
type RequestMeta = {
    ip?: string;
    userAgent?: string;
    browser?: string;
    operatingSystem?: string;
    device?: string;
};
export declare class RegisterAttendance {
    execute(userId: string, input: AttendanceInput, meta: RequestMeta): Promise<{
        type: import("@prisma/client").$Enums.AttendanceType;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        id: string;
        ipAddress: string | null;
        siteId: string;
        device: string | null;
        latitude: number;
        longitude: number;
        employeeId: string;
        recordedAt: Date;
        distanceMeters: number;
        approximateAddress: string | null;
        browser: string | null;
        operatingSystem: string | null;
        connectionType: string | null;
        excessMinutes: number | null;
    }>;
}
export {};
