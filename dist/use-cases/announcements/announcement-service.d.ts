import { AnnouncementStatus } from '@prisma/client';
export type AnnouncementInput = {
    companyId: string;
    title: string;
    body: string;
    audienceRoleId?: string | null;
    expiresAt?: Date | null;
};
export declare class AnnouncementService {
    create(createdById: string, input: AnnouncementInput): Promise<{
        company: {
            id: string;
            name: string;
        };
    } & {
        status: import("@prisma/client").$Enums.AnnouncementStatus;
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        body: string;
        title: string;
        audienceRoleId: string | null;
        publishedAt: Date | null;
        createdById: string | null;
    }>;
    list(page: number, limit: number, companyId?: string, status?: AnnouncementStatus): Promise<{
        items: ({
            company: {
                id: string;
                name: string;
            };
        } & {
            status: import("@prisma/client").$Enums.AnnouncementStatus;
            id: string;
            expiresAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            body: string;
            title: string;
            audienceRoleId: string | null;
            publishedAt: Date | null;
            createdById: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    listForUser(userId: string): Promise<{
        status: import("@prisma/client").$Enums.AnnouncementStatus;
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        body: string;
        title: string;
        audienceRoleId: string | null;
        publishedAt: Date | null;
        createdById: string | null;
    }[]>;
    publish(announcementId: string): Promise<{
        status: import("@prisma/client").$Enums.AnnouncementStatus;
        id: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        body: string;
        title: string;
        audienceRoleId: string | null;
        publishedAt: Date | null;
        createdById: string | null;
    }>;
    archive(announcementId: string): Promise<void>;
}
