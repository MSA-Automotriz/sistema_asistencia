import type { Prisma } from '@prisma/client';
export type AuditInput = {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    ipAddress?: string;
    device?: string;
    metadata?: Prisma.InputJsonValue;
};
export declare class AuditService {
    record(input: AuditInput): Promise<{
        id: string;
        userId: string | null;
        ipAddress: string | null;
        createdAt: Date;
        device: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        metadata: Prisma.JsonValue | null;
    }>;
    list(page: number, limit: number, entity?: string, userId?: string): Promise<{
        items: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            userId: string | null;
            ipAddress: string | null;
            createdAt: Date;
            device: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            metadata: Prisma.JsonValue | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
}
