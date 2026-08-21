export declare const reportTypes: readonly ["ATTENDANCE", "LATE_ARRIVALS", "OVERTIME", "WORK_PERMISSIONS", "VACATIONS", "EMPLOYEES", "DEPARTMENTS"];
export type ReportType = (typeof reportTypes)[number];
export type ReportFormat = 'CSV' | 'XLSX' | 'PDF';
export type ReportFilters = {
    startDate?: Date;
    endDate?: Date;
    companyId?: string;
    siteId?: string;
    departmentId?: string;
    employeeId?: string;
};
type ReportCell = string | number;
export type ReportTable = {
    title: string;
    columns: string[];
    rows: ReportCell[][];
};
export declare class ReportService {
    buildTable(type: ReportType, filters: ReportFilters): Promise<ReportTable>;
    export(type: ReportType, format: ReportFormat, filters: ReportFilters): Promise<{
        table: ReportTable;
        content: Buffer<ArrayBufferLike>;
        contentType: string;
        extension: string;
    }>;
    private attendanceTable;
    private overtimeTable;
    private permissionTable;
    private vacationTable;
    private employeeTable;
    private departmentTable;
    private attendanceWhere;
    private employeeDateWhere;
    private employeeWhere;
    private dateRange;
    private csv;
    private xlsx;
    private pdf;
    private employeeName;
    private date;
    private dateTime;
    private status;
}
export {};
