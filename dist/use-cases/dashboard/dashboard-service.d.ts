export declare class DashboardService {
    summary(): Promise<{
        resumenGeneral: {
            empleadosActivos: number;
            personalPresente: number;
            personalAusente: number;
            tardanzas: number;
        };
        personalPresente: number;
        personalAusente: number;
        tardanzas: number;
        permisosPendientes: number;
        horasTrabajadas: number;
        horasExtrasAprobadas: number;
        entradasHoy: number;
        salidasHoy: number;
        graficos: {
            asistenciaUltimosSieteDias: {
                fecha: string;
                entradas: number;
                salidas: number;
                tardanzas: number;
            }[];
        };
        indicadoresKpi: {
            tasaAsistencia: number;
            tasaPuntualidad: number;
            horasPromedioPorEmpleado: number;
            permisosPendientes: number;
            minutosExtraAprobados: number;
        };
        actividadReciente: {
            type: import("@prisma/client").$Enums.AttendanceType;
            status: import("@prisma/client").$Enums.AttendanceStatus;
            id: string;
            employee: {
                id: string;
                user: {
                    id: string;
                    email: string;
                    firstName: string;
                    lastName: string;
                };
                employeeCode: string;
                department: {
                    id: string;
                    name: string;
                } | null;
                position: {
                    id: string;
                    name: string;
                } | null;
            };
            recordedAt: Date;
            approximateAddress: string | null;
        }[];
    }>;
    presentEmployees(): Promise<{
        id: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        employeeCode: string;
        department: {
            id: string;
            name: string;
        } | null;
        position: {
            id: string;
            name: string;
        } | null;
    }[]>;
    absentEmployees(): Promise<{
        id: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        employeeCode: string;
        department: {
            id: string;
            name: string;
        } | null;
        position: {
            id: string;
            name: string;
        } | null;
    }[]>;
    lateArrivals(): Promise<{
        type: import("@prisma/client").$Enums.AttendanceType;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        id: string;
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            department: {
                id: string;
                name: string;
            } | null;
            position: {
                id: string;
                name: string;
            } | null;
        };
        employeeId: string;
        recordedAt: Date;
        approximateAddress: string | null;
    }[]>;
    recentActivity(): Promise<{
        type: import("@prisma/client").$Enums.AttendanceType;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        id: string;
        employee: {
            id: string;
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            employeeCode: string;
            department: {
                id: string;
                name: string;
            } | null;
            position: {
                id: string;
                name: string;
            } | null;
        };
        recordedAt: Date;
        approximateAddress: string | null;
    }[]>;
    private todayAttendance;
    private dailyMetrics;
    private hoursWorked;
    private attendanceTrend;
    private startOfDay;
    private dateKey;
    private percentage;
    private toHours;
}
