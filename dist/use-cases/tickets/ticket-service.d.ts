import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
export type CreateTicketInput = {
    title: string;
    category: TicketCategory;
    priority: TicketPriority;
    description: string;
    siteId?: string | null;
};
export type UpdateTicketStatusInput = {
    status: TicketStatus;
    resolutionNote?: string | null;
    assignedToId?: string | null;
};
export type TicketFilters = {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    siteId?: string;
    search?: string;
    scope?: 'own' | 'all';
    page?: number;
    limit?: number;
};
type AuthContext = {
    sub: string;
    permissions?: string[];
    role?: string;
};
export declare class SupportTicketService {
    private isManagerOrAdmin;
    createTicket(userId: string, input: CreateTicketInput): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: {
                name: string;
            };
            employee: {
                employeeCode: string;
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
            } | null;
        };
        site: {
            id: string;
            name: string;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        resolvedBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.TicketStatus;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        description: string;
        title: string;
        priority: import("@prisma/client").$Enums.TicketPriority;
        ticketNumber: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        assignedToId: string | null;
        resolutionNote: string | null;
        resolvedAt: Date | null;
        resolvedById: string | null;
    }>;
    listTickets(auth: AuthContext, filters: TicketFilters): Promise<{
        items: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: {
                    name: string;
                };
                employee: {
                    employeeCode: string;
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
                } | null;
            };
            site: {
                id: string;
                name: string;
            } | null;
            assignedTo: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
            resolvedBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            status: import("@prisma/client").$Enums.TicketStatus;
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            siteId: string | null;
            description: string;
            title: string;
            priority: import("@prisma/client").$Enums.TicketPriority;
            ticketNumber: string;
            category: import("@prisma/client").$Enums.TicketCategory;
            assignedToId: string | null;
            resolutionNote: string | null;
            resolvedAt: Date | null;
            resolvedById: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        isManager: boolean;
    }>;
    getTicketById(auth: AuthContext, ticketId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: {
                name: string;
            };
            employee: {
                employeeCode: string;
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
            } | null;
        };
        site: {
            id: string;
            name: string;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        resolvedBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.TicketStatus;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        description: string;
        title: string;
        priority: import("@prisma/client").$Enums.TicketPriority;
        ticketNumber: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        assignedToId: string | null;
        resolutionNote: string | null;
        resolvedAt: Date | null;
        resolvedById: string | null;
    }>;
    updateTicketStatus(auth: AuthContext, ticketId: string, input: UpdateTicketStatusInput): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: {
                name: string;
            };
            employee: {
                employeeCode: string;
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
            } | null;
        };
        site: {
            id: string;
            name: string;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        resolvedBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.TicketStatus;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        description: string;
        title: string;
        priority: import("@prisma/client").$Enums.TicketPriority;
        ticketNumber: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        assignedToId: string | null;
        resolutionNote: string | null;
        resolvedAt: Date | null;
        resolvedById: string | null;
    }>;
    cancelTicket(auth: AuthContext, ticketId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: {
                name: string;
            };
            employee: {
                employeeCode: string;
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
            } | null;
        };
        site: {
            id: string;
            name: string;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        resolvedBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        status: import("@prisma/client").$Enums.TicketStatus;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        siteId: string | null;
        description: string;
        title: string;
        priority: import("@prisma/client").$Enums.TicketPriority;
        ticketNumber: string;
        category: import("@prisma/client").$Enums.TicketCategory;
        assignedToId: string | null;
        resolutionNote: string | null;
        resolvedAt: Date | null;
        resolvedById: string | null;
    }>;
}
export {};
