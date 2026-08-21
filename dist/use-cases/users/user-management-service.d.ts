import { UserStatus } from '@prisma/client';
export type CreateUserInput = {
    email?: string;
    idUsuario?: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
    status?: UserStatus;
};
export type UpdateUserInput = {
    email?: string;
    idUsuario?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
};
export declare class UserManagementService {
    list(page: number, limit: number): Promise<{
        items: {
            status: import("@prisma/client").$Enums.UserStatus;
            id: string;
            createdAt: Date;
            email: string;
            firstName: string;
            lastName: string;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            emailVerifiedAt: Date | null;
            updatedAt: Date;
            role: {
                id: string;
                name: string;
                description: string | null;
            };
            employee: {
                id: string;
                employeeCode: string;
            } | null;
            userPermissions: {
                permission: {
                    code: string;
                    id: string;
                    description: string | null;
                };
            }[];
            _count: {
                sessions: number;
                recoveryQuestions: number;
            };
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    get(userId: string): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    create(input: CreateUserInput): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    update(userId: string, input: UpdateUserInput): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    setStatus(userId: string, status: UserStatus): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    resetPassword(userId: string, newPassword: string): Promise<void>;
    remove(userId: string): Promise<void>;
    assignRole(userId: string, roleId: string): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    replacePermissions(userId: string, permissionIds: string[]): Promise<{
        status: import("@prisma/client").$Enums.UserStatus;
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        emailVerifiedAt: Date | null;
        updatedAt: Date;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        employee: {
            id: string;
            employeeCode: string;
        } | null;
        userPermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
        _count: {
            sessions: number;
            recoveryQuestions: number;
        };
    }>;
    private ensureRole;
    private ensurePermissions;
    private throwConflictIfUnique;
}
