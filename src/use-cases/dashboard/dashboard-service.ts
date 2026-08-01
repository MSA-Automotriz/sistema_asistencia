import { prisma } from '../../database/prisma.js';

type AttendanceEvent = { employeeId: string; type: string; status: string; recordedAt: Date };
type WorkAccumulator = { workedMinutes: number; checkInAt?: Date };

const employeeDetails = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } }
};

export class DashboardService {
  async summary() {
    const { start, end, employees, attendance } = await this.todayAttendance();
    const [pendingPermissions, approvedOvertime, trend, recentActivity] = await Promise.all([
      prisma.workPermission.count({
        where: { status: 'PENDING', startDate: { lt: end }, endDate: { gte: start } }
      }),
      prisma.overtimeRequest.aggregate({
        where: { status: 'APPROVED', date: { gte: start, lt: end } },
        _sum: { requestedMinutes: true }
      }),
      this.attendanceTrend(start, end),
      this.recentActivity()
    ]);
    const metrics = this.dailyMetrics(employees, attendance);
    const workedHours = this.hoursWorked(attendance);
    const approvedOvertimeMinutes = approvedOvertime._sum.requestedMinutes ?? 0;
    const checkIns = attendance.filter(({ type }) => type === 'CHECK_IN').length;

    return {
      resumenGeneral: {
        empleadosActivos: employees.length,
        personalPresente: metrics.present.length,
        personalAusente: metrics.absent.length,
        tardanzas: metrics.late.length
      },
      personalPresente: metrics.present.length,
      personalAusente: metrics.absent.length,
      tardanzas: metrics.late.length,
      permisosPendientes: pendingPermissions,
      horasTrabajadas: this.toHours(workedHours.totalMinutes),
      horasExtrasAprobadas: this.toHours(approvedOvertimeMinutes),
      entradasHoy: checkIns,
      salidasHoy: attendance.filter(({ type }) => type === 'CHECK_OUT').length,
      graficos: { asistenciaUltimosSieteDias: trend },
      indicadoresKpi: {
        tasaAsistencia: this.percentage(metrics.present.length, employees.length),
        tasaPuntualidad: this.percentage(Math.max(checkIns - metrics.late.length, 0), checkIns),
        horasPromedioPorEmpleado: this.toHours(
          metrics.present.length ? workedHours.totalMinutes / metrics.present.length : 0
        ),
        permisosPendientes: pendingPermissions,
        minutosExtraAprobados: approvedOvertimeMinutes
      },
      actividadReciente: recentActivity
    };
  }

  async presentEmployees() {
    const { employees, attendance } = await this.todayAttendance();
    const checkIns = new Set(
      attendance.filter(({ type }) => type === 'CHECK_IN').map(({ employeeId }) => employeeId)
    );
    return employees.filter(({ id }) => checkIns.has(id));
  }

  async absentEmployees() {
    const { employees, attendance } = await this.todayAttendance();
    const checkIns = new Set(
      attendance.filter(({ type }) => type === 'CHECK_IN').map(({ employeeId }) => employeeId)
    );
    return employees.filter(({ id }) => !checkIns.has(id));
  }

  async lateArrivals() {
    const { attendance } = await this.todayAttendance();
    return attendance.filter(({ type, status }) => type === 'CHECK_IN' && status === 'LATE');
  }

  async recentActivity() {
    return prisma.attendance.findMany({
      take: 12,
      orderBy: { recordedAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        recordedAt: true,
        approximateAddress: true,
        employee: { select: employeeDetails }
      }
    });
  }

  private async todayAttendance() {
    const start = this.startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [employees, attendance] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true, user: { is: { status: 'ACTIVE' } } },
        select: employeeDetails,
        orderBy: { employeeCode: 'asc' }
      }),
      prisma.attendance.findMany({
        where: { recordedAt: { gte: start, lt: end } },
        select: {
          id: true,
          employeeId: true,
          type: true,
          status: true,
          recordedAt: true,
          approximateAddress: true,
          employee: { select: employeeDetails }
        },
        orderBy: { recordedAt: 'asc' }
      })
    ]);
    return { start, end, employees, attendance };
  }

  private dailyMetrics(employees: { id: string }[], attendance: AttendanceEvent[]) {
    const presentIds = new Set(
      attendance.filter(({ type }) => type === 'CHECK_IN').map(({ employeeId }) => employeeId)
    );
    return {
      present: employees.filter(({ id }) => presentIds.has(id)),
      absent: employees.filter(({ id }) => !presentIds.has(id)),
      late: attendance.filter(({ type, status }) => type === 'CHECK_IN' && status === 'LATE')
    };
  }

  private hoursWorked(attendance: AttendanceEvent[]) {
    const perEmployee = new Map<string, WorkAccumulator>();
    for (const event of attendance) {
      const accumulator = perEmployee.get(event.employeeId) ?? { workedMinutes: 0 };
      if (event.type === 'CHECK_IN') accumulator.checkInAt = event.recordedAt;
      if (event.type === 'CHECK_OUT' && accumulator.checkInAt) {
        accumulator.workedMinutes += Math.max(
          0,
          (event.recordedAt.getTime() - accumulator.checkInAt.getTime()) / 60_000
        );
        accumulator.checkInAt = undefined;
      }
      perEmployee.set(event.employeeId, accumulator);
    }
    return {
      totalMinutes: [...perEmployee.values()].reduce(
        (total, { workedMinutes }) => total + workedMinutes,
        0
      )
    };
  }

  private async attendanceTrend(todayStart: Date, todayEnd: Date) {
    const trendStart = new Date(todayStart);
    trendStart.setDate(trendStart.getDate() - 6);
    const records = await prisma.attendance.findMany({
      where: { recordedAt: { gte: trendStart, lt: todayEnd } },
      select: { type: true, status: true, recordedAt: true }
    });
    const trend = new Map<
      string,
      { fecha: string; entradas: number; salidas: number; tardanzas: number }
    >();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(trendStart);
      date.setDate(date.getDate() + offset);
      const fecha = this.dateKey(date);
      trend.set(fecha, { fecha, entradas: 0, salidas: 0, tardanzas: 0 });
    }
    for (const record of records) {
      const day = trend.get(this.dateKey(record.recordedAt));
      if (!day) continue;
      if (record.type === 'CHECK_IN') day.entradas += 1;
      if (record.type === 'CHECK_OUT') day.salidas += 1;
      if (record.type === 'CHECK_IN' && record.status === 'LATE') day.tardanzas += 1;
    }
    return [...trend.values()];
  }

  private startOfDay(value: Date) {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  private dateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private percentage(numerator: number, denominator: number) {
    return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
  }

  private toHours(minutes: number) {
    return Number((minutes / 60).toFixed(2));
  }
}
