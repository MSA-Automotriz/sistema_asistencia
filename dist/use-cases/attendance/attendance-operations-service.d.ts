import type { AttendanceStatus, AttendanceType } from '@prisma/client';
export type AttendanceFilters = {
    employeeId?: string;
    siteId?: string;
    companyId?: string;
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
    type?: AttendanceType;
    status?: AttendanceStatus;
    search?: string;
    page: number;
    limit: number;
};
export type OfflineAttendanceInput = {
    offlineToken: string;
    latitude: number;
    longitude: number;
    type: AttendanceType;
    recordedAt: Date;
    approximateAddress?: string;
    connectionType?: string;
    deviceFingerprint?: string;
};
export type AttendanceMeta = {
    ip?: string;
    userAgent?: string;
};
export declare class AttendanceOperationsService {
    list(filters: AttendanceFilters): Promise<{
        items: ({
            employee: {
                id: string;
                user: {
                    id: string;
                    email: string;
                    firstName: string;
                    lastName: string;
                };
                employeeCode: string;
                department: {
                    id: string;
                    name: string;
                } | null;
                position: {
                    id: string;
                    name: string;
                } | null;
            };
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
            employeeId: string;
            latitude: number;
            longitude: number;
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
    statistics(filters: Omit<AttendanceFilters, 'page' | 'limit' | 'search' | 'type' | 'status'>): Promise<{
        range: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        totals: {
            checkIns: number;
            checkOuts: number;
            late: number;
            earlyDepartures: number;
            workedHours: number;
            absences: number;
        };
        kpis: {
            attendanceRate: number;
            punctualityRate: number;
            averageHoursPerPresentEmployee: number;
            activeEmployees: number;
            daysWithPresence: number;
        };
        series: {
            date: string;
            checkIns: number;
            checkOuts: number;
            late: number;
            earlyDeparture: number;
            present: number;
        }[];
    }>;
    calendar(startDate: Date, endDate: Date, filters: Pick<AttendanceFilters, 'companyId' | 'siteId' | 'departmentId' | 'employeeId'>): Promise<{
        events: {
            id: string;
            category: string;
            title: string;
            start: Date;
            end: Date;
            status: string;
            detail: string;
        }[];
    }>;
    issueOfflinePermit(userId: string): Promise<{
        id: string;
        token: string;
        expiresAt: Date;
        site: {
            id: string;
            name: string;
            latitude: number;
            longitude: number;
            radiusMeters: number;
        };
    }>;
    synchronizeOfflineAttendance(userId: string, input: OfflineAttendanceInput, meta: AttendanceMeta): Promise<{
        type: import("@prisma/client").$Enums.AttendanceType;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        id: string;
        ipAddress: string | null;
        siteId: string;
        device: string | null;
        employeeId: string;
        latitude: number;
        longitude: number;
        recordedAt: Date;
        distanceMeters: number;
        approximateAddress: string | null;
        browser: string | null;
        operatingSystem: string | null;
        connectionType: string | null;
        excessMinutes: number | null;
    }>;
    private attendanceWhere;
    private employeeWhere;
    private employeeName;
    private startOfDay;
    private endOfDay;
    private daysBefore;
    private dateKey;
}
