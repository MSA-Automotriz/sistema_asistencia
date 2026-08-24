import { NotificationChannel, type Prisma } from '@prisma/client';
export type CreateNotificationInput = {
    userId: string;
    title: string;
    body: string;
    type?: string;
    channel?: NotificationChannel;
    metadata?: Prisma.InputJsonValue;
};
export declare class NotificationService {
    private pushService;
    create(input: CreateNotificationInput): Promise<{
        type: string | null;
        id: string;
        userId: string;
        createdAt: Date;
        metadata: Prisma.JsonValue | null;
        body: string;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        readAt: Date | null;
    }>;
    listForUser(userId: string, page: number, limit: number, unreadOnly?: boolean): Promise<{
        items: {
            type: string | null;
            id: string;
            userId: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            body: string;
            title: string;
            channel: import("@prisma/client").$Enums.NotificationChannel;
            readAt: Date | null;
        }[];
        unread: number;
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    markRead(userId: string, notificationId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
    private canSendEmail;
    private sendEmail;
}
