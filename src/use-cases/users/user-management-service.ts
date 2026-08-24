import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import { Prisma, UserStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export type CreateUserInput = {
  email?: string;
  idUsuario?: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  status?: UserStatus;
  siteId?: string | null;
};

export type UpdateUserInput = {
  email?: string;
  idUsuario?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  siteId?: string | null;
};

const userDetails = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  emailVerifiedAt: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, description: true } },
  employee: {
    select: {
      id: true,
      employeeCode: true,
      siteId: true,
      site: { select: { id: true, name: true } }
    }
  },
  userPermissions: {
    select: { permission: { select: { id: true, code: true, description: true } } }
  },
  _count: { select: { recoveryQuestions: true, sessions: true } }
} satisfies Prisma.UserSelect;

export class UserManagementService {
  async list(page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        select: userDetails,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);
    return { items, pagination: { page, limit, total } };
  }

  async get(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: userDetails });
    if (!user) throw new AppError(404, 'Usuario no encontrado');
    return user;
  }

  async create(input: CreateUserInput) {
    await this.ensureRole(input.roleId);
    if (input.siteId) {
      const site = await prisma.site.findUnique({ where: { id: input.siteId } });
      if (!site) throw new AppError(404, 'Sede no encontrada');
    }
    const idValue = input.idUsuario?.trim();
    const rawEmail = input.email?.trim() || (idValue ? `${idValue}@msa.local` : '');
    if (!rawEmail)
      throw new AppError(400, 'Debe proporcionar un ID de usuario o correo electrónico');

    try {
      return await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            email: rawEmail.toLocaleLowerCase(),
            passwordHash: await bcrypt.hash(input.password, 12),
            firstName: input.firstName,
            lastName: input.lastName,
            roleId: input.roleId,
            status: input.status ?? UserStatus.PENDING
          },
          select: userDetails
        });

        if (idValue || input.siteId) {
          const defaultCompany = await transaction.company.findFirst();
          if (defaultCompany) {
            await transaction.employee.create({
              data: {
                userId: user.id,
                companyId: defaultCompany.id,
                employeeCode: idValue || `EMP-${user.id.slice(-6)}`,
                siteId: input.siteId ? input.siteId : null,
                hiredAt: new Date(),
                active: true
              }
            });
          }
        }

        return (await transaction.user.findUnique({
          where: { id: user.id },
          select: userDetails
        }))!;
      });
    } catch (error) {
      this.throwConflictIfUnique(
        error,
        'Ya existe un usuario registrado con ese ID o correo electrónico'
      );
      throw error;
    }
  }

  async update(userId: string, input: UpdateUserInput) {
    const existing = await this.get(userId);
    if (input.roleId) await this.ensureRole(input.roleId);
    if (input.siteId) {
      const site = await prisma.site.findUnique({ where: { id: input.siteId } });
      if (!site) throw new AppError(404, 'Sede no encontrada');
    }
    const idValue = input.idUsuario?.trim();
    const hasEmail = input.email !== undefined && input.email.trim() !== '';
    const targetEmail = hasEmail
      ? input.email!.trim().toLocaleLowerCase()
      : idValue && existing.email.endsWith('@msa.local')
        ? `${idValue}@msa.local`.toLocaleLowerCase()
        : undefined;

    const hasPassword = input.password !== undefined && input.password.trim().length >= 8;
    const passwordHash = hasPassword ? await bcrypt.hash(input.password!.trim(), 12) : undefined;

    try {
      return await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: userId },
          data: {
            email: targetEmail,
            firstName: input.firstName,
            lastName: input.lastName,
            roleId: input.roleId,
            ...(passwordHash ? { passwordHash, failedLoginAttempts: 0, lockedUntil: null } : {})
          }
        });

        const existingEmployee = await transaction.employee.findUnique({
          where: { userId }
        });

        if (existingEmployee) {
          await transaction.employee.update({
            where: { userId },
            data: {
              ...(idValue ? { employeeCode: idValue } : {}),
              ...(input.siteId !== undefined ? { siteId: input.siteId ? input.siteId : null } : {})
            }
          });
        } else if (idValue || input.siteId) {
          const defaultCompany = await transaction.company.findFirst();
          if (defaultCompany) {
            await transaction.employee.create({
              data: {
                userId,
                companyId: defaultCompany.id,
                employeeCode: idValue || `EMP-${userId.slice(-6)}`,
                siteId: input.siteId ? input.siteId : null,
                hiredAt: new Date(),
                active: true
              }
            });
          }
        }

        if (passwordHash || input.roleId)
          await transaction.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() }
          });

        return (await transaction.user.findUnique({
          where: { id: userId },
          select: userDetails
        }))!;
      });
    } catch (error) {
      this.throwConflictIfUnique(
        error,
        'Ya existe un usuario registrado con ese ID o correo electrónico'
      );
      throw error;
    }
  }

  async setStatus(userId: string, status: UserStatus) {
    await this.get(userId);
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: userId },
        data: { status },
        select: userDetails
      });
      if (status !== UserStatus.ACTIVE) {
        await transaction.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }
      return user;
    });
  }

  async resetPassword(userId: string, newPassword: string) {
    await this.get(userId);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 12),
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
  }

  async remove(userId: string) {
    await this.get(userId);
    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { userId } });
      if (employee) {
        await tx.attendance.deleteMany({ where: { employeeId: employee.id } });
        await tx.vacation.deleteMany({ where: { employeeId: employee.id } });
        await tx.workPermission.deleteMany({ where: { employeeId: employee.id } });
        await tx.license.deleteMany({ where: { employeeId: employee.id } });
        await tx.overtimeRequest.deleteMany({ where: { employeeId: employee.id } });
        await tx.employee.updateMany({
          where: { supervisorId: employee.id },
          data: { supervisorId: null }
        });
        await tx.employee.delete({ where: { id: employee.id } });
      }
      await tx.session.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.recoveryQuestion.deleteMany({ where: { userId } });
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.device.deleteMany({ where: { userId } });
      await tx.offlineAttendanceToken.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async assignRole(userId: string, roleId: string) {
    await this.get(userId);
    await this.ensureRole(roleId);
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: userId },
        data: { roleId },
        select: userDetails
      });
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      return user;
    });
  }

  async replacePermissions(userId: string, permissionIds: string[]) {
    await this.get(userId);
    const uniquePermissionIds = [...new Set(permissionIds)];
    await this.ensurePermissions(uniquePermissionIds);
    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId } }),
      prisma.userPermission.createMany({
        data: uniquePermissionIds.map((permissionId) => ({ userId, permissionId }))
      }),
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
    return this.get(userId);
  }

  async exportPdf(): Promise<{ content: Buffer; contentType: string; filename: string }> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employee: {
          select: {
            employeeCode: true,
            site: { select: { name: true } }
          }
        }
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    const rows = users.map((user, index) => {
      const fullName = `${user.lastName} ${user.firstName}`.trim();
      const idUsuario =
        user.employee?.employeeCode ||
        (user.email && user.email.endsWith('@msa.local') ? user.email.split('@')[0] : user.id.slice(-8));
      const email = user.email.endsWith('@msa.local') ? '-' : user.email;
      const sede = user.employee?.site?.name || 'Sin sede';
      return {
        number: index + 1,
        fullName,
        idUsuario,
        email,
        sede
      };
    });

    const content = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 36 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const left = 36;
      const right = 595.28 - 36;
      const colWidths = {
        num: 28,
        name: 180,
        id: 70,
        email: 135,
        site: 110
      };

      const drawHeader = (startY: number) => {
        doc.rect(left, startY, right - left, 22).fill('#E30613');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');

        let curX = left + 4;
        doc.text('N°', curX, startY + 6, { width: colWidths.num - 6, align: 'center' });
        curX += colWidths.num;
        doc.text('Nombres y Apellidos', curX, startY + 6, { width: colWidths.name - 6 });
        curX += colWidths.name;
        doc.text('ID / DNI', curX, startY + 6, { width: colWidths.id - 6 });
        curX += colWidths.id;
        doc.text('Correo', curX, startY + 6, { width: colWidths.email - 6 });
        curX += colWidths.email;
        doc.text('Sede', curX, startY + 6, { width: colWidths.site - 6 });
      };

      // Encabezado del documento
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text('MSA Automotriz', left, 36);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#4B5563')
        .text('Reporte de Usuarios y Sedes Asignadas', left, 56);

      const now = new Date();
      const dateStr = now.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6B7280')
        .text(`Generado: ${dateStr} ${timeStr} | Total: ${rows.length} usuarios`, left, 72);

      doc.moveTo(left, 86).lineTo(right, 86).strokeColor('#E5E7EB').lineWidth(1).stroke();

      let y = 96;
      drawHeader(y);
      y += 22;

      rows.forEach((row, index) => {
        if (y > doc.page.height - doc.page.margins.bottom - 24) {
          doc.addPage();
          y = 36;
          drawHeader(y);
          y += 22;
        }

        if (index % 2 === 1) {
          doc.rect(left, y, right - left, 18).fill('#F9FAFB');
        }

        doc.font('Helvetica').fontSize(8).fillColor('#1F2937');
        let curX = left + 4;

        doc.text(String(row.number), curX, y + 5, {
          width: colWidths.num - 6,
          align: 'center',
          lineBreak: false
        });
        curX += colWidths.num;

        doc
          .font('Helvetica-Bold')
          .text(row.fullName, curX, y + 5, { width: colWidths.name - 6, lineBreak: false });
        curX += colWidths.name;

        doc
          .font('Helvetica')
          .text(row.idUsuario, curX, y + 5, { width: colWidths.id - 6, lineBreak: false });
        curX += colWidths.id;

        doc.text(row.email, curX, y + 5, { width: colWidths.email - 6, lineBreak: false });
        curX += colWidths.email;

        if (row.sede !== 'Sin sede') {
          doc
            .fillColor('#047857')
            .text(row.sede, curX, y + 5, { width: colWidths.site - 6, lineBreak: false });
        } else {
          doc
            .fillColor('#9CA3AF')
            .text(row.sede, curX, y + 5, { width: colWidths.site - 6, lineBreak: false });
        }

        doc
          .moveTo(left, y + 18)
          .lineTo(right, y + 18)
          .strokeColor('#F3F4F6')
          .lineWidth(0.5)
          .stroke();
        y += 18;
      });

      doc.end();
    });

    return {
      content,
      contentType: 'application/pdf',
      filename: 'msa-usuarios.pdf'
    };
  }

  private async ensureRole(roleId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
    if (!role) throw new AppError(404, 'Rol no encontrado');
  }

  private async ensurePermissions(permissionIds: string[]) {
    if (!permissionIds.length) return;
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true }
    });
    if (permissions.length !== permissionIds.length)
      throw new AppError(404, 'Uno o más permisos no existen');
  }

  private throwConflictIfUnique(error: unknown, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new AppError(409, message);
  }
}
