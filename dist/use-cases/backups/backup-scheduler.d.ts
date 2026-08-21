export declare class BackupScheduler {
    private readonly executedSlots;
    private readonly backups;
    private timer;
    private running;
    start(): void;
    stop(): void;
    runDueSchedules(now?: Date): Promise<void>;
    private parseSchedule;
    private timeForCompany;
    private removeOldSlots;
}
