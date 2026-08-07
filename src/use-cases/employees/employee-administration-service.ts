import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { Prisma, UserStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
import { randomToken } from '../../utils/crypto.js';

export type EmployeeInput = {
  userId: string;
  companyId: string;
  employeeCode: string;
  siteId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  scheduleId?: string | null;
  supervisorId?: string | null;
  qrCode?: string | null;
  profilePhotoUrl?: string | null;
  hiredAt: Date;
  active?: boolean;
};

export type EmployeeUpdateInput = Omit<Partial<EmployeeInput>, 'userId'>;

type SpreadsheetRow = Record<string, string>;

export class EmployeeAdministrationService {
  async create(input: EmployeeInput) {
    await this.ensureUserAvailable(input.userId);
    await this.validateAssignments(input.companyId, input);
    try {
      return await prisma.employee.create({
        data: { ...input, qrCode: input.qrCode ?? randomToken(), active: input.active ?? true },
        include: this.details()
      });
    } catch (error) {
      this.throwUniqueError(error);
      throw error;
    }
  }

  async update(employeeId: string, input: EmployeeUpdateInput) {
    const current = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!current) throw new AppError(404, 'Empleado no encontrado');
    const companyId = input.companyId ?? current.companyId;
    await this.validateAssignments(companyId, input, employeeId);
    try {
      return await prisma.employee.update({
        where: { id: employeeId },
        data: input,
        include: this.details()
      });
    } catch (error) {
      this.throwUniqueError(error);
      throw error;
    }
  }

  async generateQrCode(employeeId: string) {
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { qrCode: randomToken() },
      select: { id: true, employeeCode: true, qrCode: true }
    });
    return employee;
  }

  async importWorkbook(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new AppError(422, 'El archivo no contiene una hoja de cálculo');
    const rows = this.spreadsheetRows(worksheet);
    if (!rows.length) throw new AppError(422, 'El archivo no contiene empleados');
    if (rows.length > 500)
      throw new AppError(422, 'Puede importar hasta 500 empleados por archivo');
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'Empleado' },
      select: { id: true }
    });
    if (!defaultRole)
      throw new AppError(500, 'No existe el rol Empleado requerido para la importación');

    const created: { row: number; employeeId: string; email: string }[] = [];
    const errors: { row: number; message: string }[] = [];
    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      try {
        const email = this.required(row, 'email', 'correo');
        const password = this.required(row, 'password', 'contraseña', 'contrasena');
        const firstName = this.required(row, 'firstname', 'nombre');
        const lastName = this.required(row, 'lastname', 'apellido');
        const employeeCode = this.required(row, 'employeecode', 'codigoempleado', 'codigo');
        const companyId = this.required(row, 'companyid', 'empresaid');
        const hiredAt = this.toDate(this.required(row, 'hiredat', 'fechaingreso'));
        if (password.length < 12)
          throw new AppError(422, 'La contraseña debe tener al menos 12 caracteres');
        const role = await this.resolveRole(row.role, defaultRole.id);
        const status = this.toUserStatus(row.status);
        const employee = await prisma.$transaction(async (transaction) => {
          const user = await transaction.user.create({
            data: {
              email: email.toLowerCase(),
              passwordHash: await bcrypt.hash(password, 12),
              firstName,
              lastName,
              roleId: role,
              status
            }
          });
          await this.validateAssignments(companyId, {
            companyId,
            siteId: this.optional(row, 'siteid', 'sedeid'),
            departmentId: this.optional(row, 'departmentid', 'areaid'),
            positionId: this.optional(row, 'positionid', 'cargoid'),
            scheduleId: this.optional(row, 'scheduleid', 'horarioid'),
            supervisorId: this.optional(row, 'supervisorid'),
            employeeCode,
            userId: user.id,
            hiredAt
          });
          return transaction.employee.create({
            data: {
              userId: user.id,
              companyId,
              employeeCode,
              hiredAt,
              siteId: this.optional(row, 'siteid', 'sedeid'),
              departmentId: this.optional(row, 'departmentid', 'areaid'),
              positionId: this.optional(row, 'positionid', 'cargoid'),
              scheduleId: this.optional(row, 'scheduleid', 'horarioid'),
              supervisorId: this.optional(row, 'supervisorid'),
              qrCode: randomToken(),
              active: this.toBoolean(row.active, true)
            }
          });
        });
        created.push({ row: rowNumber, employeeId: employee.id, email });
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    return { created, errors, total: rows.length };
  }

  private details() {
    return {
      user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      company: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      schedule: { select: { id: true, name: true, type: true } },
      supervisor: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { firstName: true, lastName: true } }
        }
      }
    };
  }

  private async ensureUserAvailable(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, employee: { select: { id: true } } }
    });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    if (user.employee) throw new AppError(409, 'El usuario ya tiene un perfil de empleado');
  }

  private async validateAssignments(
    companyId: string,
    input: Partial<EmployeeInput>,
    employeeId?: string
  ) {
    const [company, site, department, position, schedule, supervisor] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }),
      input.siteId
        ? prisma.site.findUnique({ where: { id: input.siteId }, select: { companyId: true } })
        : null,
      input.departmentId
        ? prisma.department.findUnique({
            where: { id: input.departmentId },
            select: { companyId: true }
          })
        : null,
      input.positionId
        ? prisma.position.findUnique({
            where: { id: input.positionId },
            select: { companyId: true }
          })
        : null,
      input.scheduleId
        ? prisma.schedule.findUnique({ where: { id: input.scheduleId }, select: { id: true } })
        : null,
      input.supervisorId
        ? prisma.employee.findUnique({
            where: { id: input.supervisorId },
            select: { companyId: true }
          })
        : null
    ]);
    if (!company) throw new AppError(404, 'Empresa no encontrada');
    if (input.siteId && (!site || site.companyId !== companyId))
      throw new AppError(422, 'La sede no pertenece a la empresa');
    if (input.departmentId && (!department || department.companyId !== companyId))
      throw new AppError(422, 'El área no pertenece a la empresa');
    if (input.positionId && (!position || position.companyId !== companyId))
      throw new AppError(422, 'El cargo no pertenece a la empresa');
    if (input.scheduleId && !schedule) throw new AppError(404, 'Horario no encontrado');
    if (input.supervisorId && (!supervisor || supervisor.companyId !== companyId))
      throw new AppError(422, 'El supervisor no pertenece a la empresa');
    if (employeeId && input.supervisorId === employeeId)
      throw new AppError(422, 'Un empleado no puede ser su propio supervisor');
  }

  private spreadsheetRows(worksheet: ExcelJS.Worksheet): SpreadsheetRow[] {
    const headerRow = worksheet.getRow(1);
    const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
    const headers = headerValues.map((value) => this.header(String(value ?? '')));
    const rows: SpreadsheetRow[] = [];
    worksheet.eachRow((row, number) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      if (number === 1 || !values.some((value) => String(value ?? '').trim())) return;
      const record: SpreadsheetRow = {};
      values.forEach((value, index) => {
        const header = headers[index];
        if (header) record[header] = String(value ?? '').trim();
      });
      rows.push(record);
    });
    return rows;
  }

  private header(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private required(row: SpreadsheetRow, ...keys: string[]) {
    const value = this.optional(row, ...keys);
    if (!value) throw new AppError(422, `Falta la columna o valor ${keys[0]}`);
    return value;
  }

  private optional(row: SpreadsheetRow, ...keys: string[]) {
    return keys.map((key) => row[key]).find((value) => value) || undefined;
  }

  private toDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError(422, 'La fecha de ingreso no es válida');
    return date;
  }

  private toBoolean(value: string | undefined, fallback: boolean) {
    if (!value) return fallback;
    return ['true', '1', 'si', 'sí', 'activo', 'active'].includes(value.toLowerCase());
  }

  private toUserStatus(value: string | undefined) {
    if (!value) return UserStatus.PENDING;
    const normalized = value.toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'ACTIVO') return UserStatus.ACTIVE;
    if (normalized === 'INACTIVE' || normalized === 'INACTIVO') return UserStatus.INACTIVE;
    return UserStatus.PENDING;
  }

  private async resolveRole(value: string | undefined, fallbackRoleId: string) {
    if (!value) return fallbackRoleId;
    const role = await prisma.role.findUnique({ where: { name: value }, select: { id: true } });
    if (!role) throw new AppError(422, `Rol no encontrado: ${value}`);
    return role.id;
  }

  private throwUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new AppError(409, 'Ya existe un empleado, usuario, código o QR con esos datos');
  }
}
