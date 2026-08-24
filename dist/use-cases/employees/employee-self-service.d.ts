import type { AttendanceStatus, AttendanceType, Prisma } from '@prisma/client';
export type AttendanceHistoryFilters = {
    startDate?: Date;
    endDate?: Date;
    type?: AttendanceType;
    status?: AttendanceStatus;
    page: number;
    limit: number;
};
export type UpdateOwnProfileInput = {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string | null;
};
export type RegisterDeviceInput = {
    fingerprint: string;
    name?: string;
    userAgent?: string;
    ipAddress?: string;
};
export declare class EmployeeSelfService {
    getProfile(userId: string): Promise<{
        id: string;
        employeeCode: string;
        profilePhotoUrl: null;
        hiredAt: Date;
        active: boolean;
        user: {
            status: import("@prisma/client").$Enums.UserStatus;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        company: {
            id: string;
            name: string;
            timeZone: string;
            logoUrl: null;
        } | null;
        site: {
            id: string;
            name: string;
            address: string;
            latitude: number;
            longitude: number;
            radiusMeters: number;
        } | null;
        department: null;
        position: null;
        schedule: null;
        supervisor: null;
    } | {
        site: {
            latitude: number;
            longitude: number;
            id: string;
            name: string;
            address: string;
            radiusMeters: number;
        } | null;
        id: string;
        user: {
            status: import("@prisma/client").$Enums.UserStatus;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        employeeCode: string;
        profilePhotoUrl: string | null;
        hiredAt: Date;
        active: boolean;
        company: {
            id: string;
            name: string;
            timeZone: string;
            logoUrl: string | null;
        };
        department: {
            id: string;
            name: string;
        } | null;
        position: {
            id: string;
            name: string;
        } | null;
        schedule: {
            type: import("@prisma/client").$Enums.ScheduleType;
            id: string;
            name: string;
            startTime: string;
            endTime: string;
            toleranceMinutes: number;
            flexibleWindowMinutes: number;
            breakStartTime: string | null;
            breakEndTime: string | null;
            workDays: Prisma.JsonValue;
        } | null;
        supervisor: {
            id: string;
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        } | null;
    }>;
    updateProfile(userId: string, input: UpdateOwnProfileInput): Promise<{
        id: string;
        user: {
            status: import("@prisma/client").$Enums.UserStatus;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        employeeCode: string;
        profilePhotoUrl: string | null;
        hiredAt: Date;
        active: boolean;
        company: {
            id: string;
            name: string;
            timeZone: string;
            logoUrl: string | null;
        };
        site: {
            id: string;
            name: string;
            address: string;
            latitude: number;
            longitude: number;
            radiusMeters: number;
        } | null;
        department: {
            id: string;
            name: string;
        } | null;
        position: {
            id: string;
            name: string;
        } | null;
        schedule: {
            type: import("@prisma/client").$Enums.ScheduleType;
            id: string;
            name: string;
            startTime: string;
            endTime: string;
            toleranceMinutes: number;
            flexibleWindowMinutes: number;
            breakStartTime: string | null;
            breakEndTime: string | null;
            workDays: Prisma.JsonValue;
        } | null;
        supervisor: {
            id: string;
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        } | null;
    }>;
    attendanceHistory(userId: string, filters: AttendanceHistoryFilters): Promise<{
        items: ({
            site: {
                id: string;
                name: string;
                address: string;
            };
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getLastAttendance(userId: string): Promise<{
        type: import("@prisma/client").$Enums.AttendanceType;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        id: string;
        site: {
            id: string;
            name: string;
        };
        recordedAt: Date;
        excessMinutes: number | null;
    } | null>;
    requestHistory(userId: string): Promise<{
        items: ({
            id: string;
            type: "VACATION";
            status: import("@prisma/client").$Enums.RequestStatus;
            startDate: Date;
            endDate: Date;
            reason: string | null;
            reviewedAt: Date | null;
            reviewNote: string | null;
            createdAt: Date;
        } | {
            id: string;
            type: "LICENSE";
            status: import("@prisma/client").$Enums.RequestStatus;
            startDate: Date;
            endDate: Date;
            reason: string | null;
            licenseType: string;
            reviewedAt: Date | null;
            reviewNote: string | null;
            createdAt: Date;
        } | {
            id: string;
            type: "WORK_PERMISSION";
            status: import("@prisma/client").$Enums.RequestStatus;
            startDate: Date;
            endDate: Date;
            reason: string;
            reviewedAt: Date | null;
            createdAt: Date;
        } | {
            id: string;
            type: "OVERTIME";
            status: import("@prisma/client").$Enums.RequestStatus;
            date: Date;
            requestedMinutes: number;
            reason: string;
            reviewedAt: Date | null;
            createdAt: Date;
        })[];
        total: number;
    }>;
    listDevices(userId: string): Promise<{
        status: import("@prisma/client").$Enums.DeviceStatus;
        id: string;
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        fingerprint: string;
        lastSeenAt: Date;
    }[]>;
    registerDevice(userId: string, input: RegisterDeviceInput): Promise<{
        status: import("@prisma/client").$Enums.DeviceStatus;
        id: string;
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        fingerprint: string;
        lastSeenAt: Date;
    }>;
    removeOwnDevice(userId: string, deviceId: string): Promise<void>;
    requestStatusSummary(userId: string): Promise<{
        vacations: number;
        licenses: number;
        workPermissions: number;
        overtime: number;
        total: number;
    }>;
    private activeEmployeeForUser;
}
