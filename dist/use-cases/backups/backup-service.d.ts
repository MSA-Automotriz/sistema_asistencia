import { BackupType } from '@prisma/client';
export type BackupSchedule = {
    enabled: boolean;
    frequency: 'DAILY' | 'WEEKLY';
    hour: number;
    minute: number;
    type: BackupType;
    dayOfWeek?: number;
};
export declare class BackupService {
    list(companyId: string, page: number, limit: number): Promise<{
        items: {
            type: import("@prisma/client").$Enums.BackupType;
            status: import("@prisma/client").$Enums.BackupStatus;
            id: string;
            createdAt: Date;
            companyId: string;
            createdById: string | null;
            storagePath: string | null;
            errorMessage: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    start(companyId: string, type: BackupType, createdById?: string): Promise<{
        type: import("@prisma/client").$Enums.BackupType;
        status: import("@prisma/client").$Enums.BackupStatus;
        id: string;
        createdAt: Date;
        companyId: string;
        createdById: string | null;
        storagePath: string | null;
        errorMessage: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
    restore(backupId: string, confirmation: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.BackupType;
        restoredAt: Date;
    }>;
    getSchedule(companyId: string): Promise<BackupSchedule | null>;
    setSchedule(companyId: string, schedule: BackupSchedule): Promise<{
        value: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        key: string;
    }>;
    private execute;
    private createDatabaseBackup;
    private createFilesBackup;
    private restoreDatabase;
    private runProcess;
    private databaseConnection;
    private mysqldumpPath;
    private mysqlPath;
    private fileTimestamp;
    private errorMessage;
}
