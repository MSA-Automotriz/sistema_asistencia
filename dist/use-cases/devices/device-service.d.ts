import type { DeviceStatus } from '@prisma/client';
export declare class DeviceService {
    list(page: number, limit: number, status?: DeviceStatus, userId?: string): Promise<{
        items: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    setStatus(deviceId: string, status: DeviceStatus): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
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
}
