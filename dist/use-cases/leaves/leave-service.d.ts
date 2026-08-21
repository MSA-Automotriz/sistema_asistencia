export type VacationInput = {
    startDate: Date;
    endDate: Date;
    reason?: string;
};
export type LicenseInput = VacationInput & {
    type: string;
};
export type LeaveReviewInput = {
    status: 'APPROVED' | 'REJECTED';
    reviewNote?: string;
};
export declare class LeaveService {
    listVacations(page: number, limit: number): Promise<{
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
                company: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                } | null;
            };
        } & {
            status: import("@prisma/client").$Enums.RequestStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            startDate: Date;
            endDate: Date;
            reason: string | null;
            reviewedAt: Date | null;
            approvedById: string | null;
            reviewNote: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    listLicenses(page: number, limit: number): Promise<{
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
                company: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                } | null;
            };
        } & {
            type: string;
            status: import("@prisma/client").$Enums.RequestStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            startDate: Date;
            endDate: Date;
            reason: string | null;
            reviewedById: string | null;
            reviewedAt: Date | null;
            reviewNote: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    createVacation(userId: string, input: VacationInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        approvedById: string | null;
        reviewNote: string | null;
    }>;
    listOwnVacations(userId: string): Promise<({
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        approvedById: string | null;
        reviewNote: string | null;
    })[]>;
    cancelVacation(userId: string, vacationId: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        approvedById: string | null;
        reviewNote: string | null;
    }>;
    reviewVacation(vacationId: string, reviewerId: string, input: LeaveReviewInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedAt: Date | null;
        approvedById: string | null;
        reviewNote: string | null;
    }>;
    createLicense(userId: string, input: LicenseInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        type: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        reviewNote: string | null;
    }>;
    listOwnLicenses(userId: string): Promise<({
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        type: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        reviewNote: string | null;
    })[]>;
    cancelLicense(userId: string, licenseId: string): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        type: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        reviewNote: string | null;
    }>;
    reviewLicense(licenseId: string, reviewerId: string, input: LeaveReviewInput): Promise<{
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            company: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            } | null;
        };
    } & {
        type: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        reviewedById: string | null;
        reviewedAt: Date | null;
        reviewNote: string | null;
    }>;
    private employeeForUser;
    private ensureNoOverlap;
    private ensureValidPeriod;
    private ensurePending;
}
