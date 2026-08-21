export type EmployeeInput = {
    userId: string;
    companyId: string;
    employeeCode: string;
    siteId?: string | null;
    departmentId?: string | null;
    positionId?: string | null;
    scheduleId?: string | null;
    supervisorId?: string | null;
    profilePhotoUrl?: string | null;
    hiredAt: Date;
    active?: boolean;
};
export type EmployeeUpdateInput = Omit<Partial<EmployeeInput>, 'userId'>;
export declare class EmployeeAdministrationService {
    create(input: EmployeeInput): Promise<{
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
        };
        site: {
            id: string;
            name: string;
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
        } | null;
        supervisor: {
            id: string;
            user: {
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        } | null;
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        departmentId: string | null;
        positionId: string | null;
        scheduleId: string | null;
        supervisorId: string | null;
        employeeCode: string;
        profilePhotoUrl: string | null;
        hiredAt: Date;
        active: boolean;
    }>;
    update(employeeId: string, input: EmployeeUpdateInput): Promise<{
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
        };
        site: {
            id: string;
            name: string;
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
        } | null;
        supervisor: {
            id: string;
            user: {
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
        } | null;
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        departmentId: string | null;
        positionId: string | null;
        scheduleId: string | null;
        supervisorId: string | null;
        employeeCode: string;
        profilePhotoUrl: string | null;
        hiredAt: Date;
        active: boolean;
    }>;
    importWorkbook(buffer: Buffer): Promise<{
        created: {
            row: number;
            employeeId: string;
            email: string;
        }[];
        errors: {
            row: number;
            message: string;
        }[];
        total: number;
    }>;
    private details;
    private ensureUserAvailable;
    private validateAssignments;
    private spreadsheetRows;
    private header;
    private required;
    private optional;
    private toDate;
    private toBoolean;
    private toUserStatus;
    private resolveRole;
    private throwUniqueError;
}
