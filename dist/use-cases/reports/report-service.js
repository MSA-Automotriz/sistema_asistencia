import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../../database/prisma.js';
export const reportTypes = [
    'ATTENDANCE',
    'LATE_ARRIVALS',
    'OVERTIME',
    'WORK_PERMISSIONS',
    'VACATIONS',
    'EMPLOYEES',
    'DEPARTMENTS'
];
const employeeSelect = {
    employeeCode: true,
    user: { select: { firstName: true, lastName: true, email: true } },
    company: { select: { name: true } },
    site: { select: { name: true } },
    department: { select: { name: true } },
    position: { select: { name: true } },
    schedule: { select: { name: true } }
};
export class ReportService {
    async buildTable(type, filters) {
        switch (type) {
            case 'ATTENDANCE':
                return this.attendanceTable(filters, false);
            case 'LATE_ARRIVALS':
                return this.attendanceTable(filters, true);
            case 'OVERTIME':
                return this.overtimeTable(filters);
            case 'WORK_PERMISSIONS':
                return this.permissionTable(filters);
            case 'VACATIONS':
                return this.vacationTable(filters);
            case 'EMPLOYEES':
                return this.employeeTable(filters);
            case 'DEPARTMENTS':
                return this.departmentTable(filters);
        }
    }
    async export(type, format, filters) {
        const table = await this.buildTable(type, filters);
        if (format === 'CSV')
            return {
                table,
                content: this.csv(table),
                contentType: 'text/csv; charset=utf-8',
                extension: 'csv'
            };
        if (format === 'XLSX')
            return {
                table,
                content: await this.xlsx(table),
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                extension: 'xlsx'
            };
        return {
            table,
            content: await this.pdf(table),
            contentType: 'application/pdf',
            extension: 'pdf'
        };
    }
    async attendanceTable(filters, lateOnly) {
        const where = this.attendanceWhere(filters, lateOnly);
        const records = await prisma.attendance.findMany({
            where,
            orderBy: { recordedAt: 'desc' },
            include: {
                site: { select: { name: true } },
                employee: { select: employeeSelect }
            }
        });
        return {
            title: lateOnly ? 'Reporte de tardanzas' : 'Reporte de asistencias',
            columns: [
                'Fecha y hora',
                'Empleado',
                'Código',
                'Sede',
                'Tipo',
                'Estado',
                'Distancia (m)',
                'Dirección',
                'IP',
                'Dispositivo'
            ],
            rows: records.map((record) => [
                this.dateTime(record.recordedAt),
                this.employeeName(record.employee),
                record.employee.employeeCode,
                record.site.name,
                record.type === 'CHECK_IN'
                    ? 'Entrada'
                    : record.type === 'BREAK_OUT'
                        ? 'Salida Refrigerio'
                        : record.type === 'BREAK_IN'
                            ? 'Retorno Refrigerio'
                            : 'Salida',
                this.status(record.status),
                Number(record.distanceMeters.toFixed(2)),
                record.approximateAddress ?? '-',
                record.ipAddress ?? '-',
                record.device ?? '-'
            ])
        };
    }
    async overtimeTable(filters) {
        const records = await prisma.overtimeRequest.findMany({
            where: {
                ...this.employeeDateWhere(filters),
                date: this.dateRange(filters.startDate, filters.endDate)
            },
            orderBy: { date: 'desc' },
            include: { employee: { select: employeeSelect } }
        });
        return {
            title: 'Reporte de horas extra',
            columns: ['Fecha', 'Empleado', 'Código', 'Área', 'Minutos', 'Horas', 'Estado', 'Motivo'],
            rows: records.map((record) => [
                this.date(record.date),
                this.employeeName(record.employee),
                record.employee.employeeCode,
                record.employee.department?.name ?? '-',
                record.requestedMinutes,
                Number((record.requestedMinutes / 60).toFixed(2)),
                this.status(record.status),
                record.reason
            ])
        };
    }
    async permissionTable(filters) {
        const records = await prisma.workPermission.findMany({
            where: {
                ...this.employeeDateWhere(filters),
                startDate: { lte: filters.endDate ?? new Date('9999-12-31') },
                endDate: { gte: filters.startDate ?? new Date('1970-01-01') }
            },
            orderBy: { startDate: 'desc' },
            include: { employee: { select: employeeSelect } }
        });
        return {
            title: 'Reporte de permisos laborales',
            columns: ['Inicio', 'Fin', 'Empleado', 'Código', 'Área', 'Estado', 'Motivo'],
            rows: records.map((record) => [
                this.dateTime(record.startDate),
                this.dateTime(record.endDate),
                this.employeeName(record.employee),
                record.employee.employeeCode,
                record.employee.department?.name ?? '-',
                this.status(record.status),
                record.reason
            ])
        };
    }
    async vacationTable(filters) {
        const records = await prisma.vacation.findMany({
            where: {
                ...this.employeeDateWhere(filters),
                startDate: { lte: filters.endDate ?? new Date('9999-12-31') },
                endDate: { gte: filters.startDate ?? new Date('1970-01-01') }
            },
            orderBy: { startDate: 'desc' },
            include: { employee: { select: employeeSelect } }
        });
        return {
            title: 'Reporte de vacaciones',
            columns: [
                'Inicio',
                'Fin',
                'Empleado',
                'Código',
                'Área',
                'Estado',
                'Motivo',
                'Nota de revisión'
            ],
            rows: records.map((record) => [
                this.date(record.startDate),
                this.date(record.endDate),
                this.employeeName(record.employee),
                record.employee.employeeCode,
                record.employee.department?.name ?? '-',
                this.status(record.status),
                record.reason ?? '-',
                record.reviewNote ?? '-'
            ])
        };
    }
    async employeeTable(filters) {
        const employees = await prisma.employee.findMany({
            where: {
                ...(filters.companyId ? { companyId: filters.companyId } : {}),
                ...(filters.siteId ? { siteId: filters.siteId } : {}),
                ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
                ...(filters.employeeId ? { id: filters.employeeId } : {})
            },
            orderBy: { employeeCode: 'asc' },
            select: employeeSelect
        });
        return {
            title: 'Reporte de empleados',
            columns: ['Código', 'Empleado', 'Correo', 'Empresa', 'Sede', 'Área', 'Cargo', 'Horario'],
            rows: employees.map((employee) => [
                employee.employeeCode,
                this.employeeName(employee),
                employee.user.email,
                employee.company.name,
                employee.site?.name ?? '-',
                employee.department?.name ?? '-',
                employee.position?.name ?? '-',
                employee.schedule?.name ?? '-'
            ])
        };
    }
    async departmentTable(filters) {
        const departments = await prisma.department.findMany({
            where: { ...(filters.companyId ? { companyId: filters.companyId } : {}) },
            orderBy: { name: 'asc' },
            include: { company: { select: { name: true } }, _count: { select: { employees: true } } }
        });
        return {
            title: 'Reporte de áreas',
            columns: ['Área', 'Empresa', 'Descripción', 'Empleados'],
            rows: departments.map((department) => [
                department.name,
                department.company.name,
                department.description ?? '-',
                department._count.employees
            ])
        };
    }
    attendanceWhere(filters, lateOnly) {
        const employee = this.employeeWhere(filters);
        return {
            ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
            ...(filters.siteId ? { siteId: filters.siteId } : {}),
            ...(Object.keys(employee).length ? { employee: { is: employee } } : {}),
            ...(lateOnly ? { type: 'CHECK_IN', status: 'LATE' } : {}),
            ...(Object.keys(this.dateRange(filters.startDate, filters.endDate)).length
                ? { recordedAt: this.dateRange(filters.startDate, filters.endDate) }
                : {})
        };
    }
    employeeDateWhere(filters) {
        const employee = this.employeeWhere(filters);
        return {
            ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
            ...(Object.keys(employee).length ? { employee: { is: employee } } : {})
        };
    }
    employeeWhere(filters) {
        return {
            ...(filters.companyId ? { companyId: filters.companyId } : {}),
            ...(filters.departmentId ? { departmentId: filters.departmentId } : {})
        };
    }
    dateRange(startDate, endDate) {
        return {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {})
        };
    }
    csv(table) {
        const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
        return Buffer.from(`\ufeff${[table.columns, ...table.rows].map((row) => row.map(escape).join(',')).join('\r\n')}`, 'utf8');
    }
    async xlsx(table) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MSA Asistencia';
        const worksheet = workbook.addWorksheet('Reporte');
        worksheet.addRow([table.title]);
        worksheet.mergeCells(1, 1, 1, table.columns.length);
        worksheet.getCell('A1').font = { bold: true, size: 15 };
        worksheet.addRow(table.columns);
        worksheet.getRow(2).font = { bold: true };
        worksheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE30613' } };
        worksheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        table.rows.forEach((row) => worksheet.addRow(row));
        worksheet.columns.forEach((column) => {
            column.width = Math.min(42, Math.max(12, ...(column.values ?? []).map((value) => String(value ?? '').length + 2)));
        });
        const output = await workbook.xlsx.writeBuffer();
        return Buffer.from(output);
    }
    pdf(table) {
        return new Promise((resolve, reject) => {
            const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
            const chunks = [];
            document.on('data', (chunk) => chunks.push(chunk));
            document.on('error', reject);
            document.on('end', () => resolve(Buffer.concat(chunks)));
            const left = document.page.margins.left;
            const right = document.page.width - document.page.margins.right;
            const width = (right - left) / table.columns.length;
            let y = 62;
            const drawHeader = () => {
                document.font('Helvetica-Bold').fontSize(7);
                table.columns.forEach((column, index) => document.text(column, left + width * index + 2, y, { width: width - 4, lineBreak: false }));
                y += 18;
                document
                    .moveTo(left, y - 3)
                    .lineTo(right, y - 3)
                    .strokeColor('#999999')
                    .stroke();
            };
            document.font('Helvetica-Bold').fontSize(16).text(table.title, left, 32);
            drawHeader();
            document.font('Helvetica').fontSize(6.4);
            for (const row of table.rows) {
                if (y > document.page.height - document.page.margins.bottom - 20) {
                    document.addPage();
                    y = 38;
                    drawHeader();
                    document.font('Helvetica').fontSize(6.4);
                }
                row.forEach((value, index) => document.text(String(value).slice(0, 56), left + width * index + 2, y, {
                    width: width - 4,
                    lineBreak: false
                }));
                y += 14;
            }
            document.end();
        });
    }
    employeeName(employee) {
        return `${employee.user.firstName} ${employee.user.lastName}`.trim();
    }
    date(value) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(value);
    }
    dateTime(value) {
        const datePart = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(value);
        const timePart = new Intl.DateTimeFormat('es-PE', {
            timeZone: 'America/Lima',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(value);
        return `${datePart} ${timePart}`;
    }
    status(value) {
        return ({
            PENDING: 'Pendiente',
            APPROVED: 'Aprobado',
            REJECTED: 'Rechazado',
            CANCELLED: 'Cancelado',
            ON_TIME: 'Puntual',
            LATE: 'Tardanza',
            EARLY_DEPARTURE: 'Salida anticipada',
            OUTSIDE_GEOFENCE: 'Fuera de geocerca'
        }[value] ?? value);
    }
}
//# sourceMappingURL=report-service.js.map