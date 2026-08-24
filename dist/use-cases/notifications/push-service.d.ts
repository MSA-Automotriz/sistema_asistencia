export type PushPayload = {
    title: string;
    body: string;
    type?: string;
    url?: string;
    tag?: string;
    data?: Record<string, unknown>;
};
export type SubscribeInput = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};
export declare class PushService {
    private initialized;
    constructor();
    private initVapid;
    getPublicKey(): string;
    saveSubscription(userId: string, data: SubscribeInput, userAgent?: string): Promise<{
        auth: string;
        id: string;
        userId: string;
        userAgent: string | null;
        createdAt: Date;
        updatedAt: Date;
        endpoint: string;
        p256dh: string;
    }>;
    removeSubscription(userId: string, endpoint: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    listUserSubscriptions(userId: string): Promise<{
        id: string;
        userAgent: string | null;
        createdAt: Date;
        endpoint: string;
    }[]>;
    sendNotification(userId: string, payload: PushPayload): Promise<void>;
    sendNotificationToMany(userIds: string[], payload: PushPayload): Promise<void>;
}
