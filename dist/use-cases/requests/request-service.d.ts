export type WorkPermissionInput = {
    startDate: Date;
    endDate: Date;
    reason: string;
};
export type OvertimeRequestInput = {
    date: Date;
    requestedMinutes: number;
    reason: string;
};
export type ReviewStatus = 'APPROVED' | 'REJECTED';
export declare class RequestService {
    listWorkPermissions(page: number, limit: number): Promise<{
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
            };
        } & {
            status: import("@prisma/client").$Enums.RequestStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            startDate: Date;
            endDate: Date;
            reason: string;
            reviewedById: string | null;
            reviewedAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    listOvertimeRequests(page: number, limit: number): Promise<{
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
            };
        } & {
            status: import("@prisma/client").$Enums.RequestStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            employeeId: string;
            reason: string;
            reviewedById: string | null;
            reviewedAt: Date | null;
            requestedMinutes: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    createWorkPermission(userId: string, input: WorkPermissionInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
    }>;
    listOwnWorkPermissions(userId: string): Promise<({
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
    })[]>;
    cancelWorkPermission(userId: string, requestId: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
    }>;
    reviewWorkPermission(requestId: string, status: ReviewStatus, reviewedById: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
    }>;
    createOvertimeRequest(userId: string, input: OvertimeRequestInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
        requestedMinutes: number;
    }>;
    listOwnOvertimeRequests(userId: string): Promise<({
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
        requestedMinutes: number;
    })[]>;
    cancelOvertimeRequest(userId: string, requestId: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
        requestedMinutes: number;
    }>;
    reviewOvertimeRequest(requestId: string, status: ReviewStatus, reviewedById: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        employeeId: string;
        reason: string;
        reviewedById: string | null;
        reviewedAt: Date | null;
        requestedMinutes: number;
    }>;
    private employeeForUser;
    private ensureValidPeriod;
}
