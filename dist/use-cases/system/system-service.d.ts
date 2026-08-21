export type SystemLogKind = 'error' | 'combined';
export declare class SystemService {
    status(): Promise<{
        application: string;
        environment: "development" | "test" | "production";
        database: string;
        uptimeSeconds: number;
        generatedAt: Date;
        metrics: {
            users: number;
            activeEmployees: number;
            pendingRequests: number;
            unreadNotifications: number;
        };
    }>;
    logs(kind: SystemLogKind, limit: number): Promise<Record<string, unknown>[]>;
    cleanExpiredData(retentionDays: number): Promise<{
        auditLogs: number;
        sessions: number;
        offlineTokens: number;
        passwordTokens: number;
    }>;
    analyzeDatabase(): Promise<{
        results: ({
            table: string;
            status: string;
            message?: undefined;
        } | {
            table: string;
            status: string;
            message: string;
        })[];
    }>;
}
