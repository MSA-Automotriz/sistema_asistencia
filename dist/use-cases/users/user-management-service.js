import bcrypt from 'bcrypt';
import { Prisma, UserStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
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
    employee: { select: { id: true, employeeCode: true } },
    userPermissions: {
        select: { permission: { select: { id: true, code: true, description: true } } }
    },
    _count: { select: { recoveryQuestions: true, sessions: true } }
};
export class UserManagementService {
    async list(page, limit) {
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
    async get(userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: userDetails });
        if (!user)
            throw new AppError(404, 'Usuario no encontrado');
        return user;
    }
    async create(input) {
        await this.ensureRole(input.roleId);
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
                if (idValue) {
                    const defaultCompany = await transaction.company.findFirst();
                    if (defaultCompany) {
                        await transaction.employee.create({
                            data: {
                                userId: user.id,
                                companyId: defaultCompany.id,
                                employeeCode: idValue,
                                hiredAt: new Date(),
                                active: true
                            }
                        });
                    }
                }
                return (await transaction.user.findUnique({
                    where: { id: user.id },
                    select: userDetails
                }));
            });
        }
        catch (error) {
            this.throwConflictIfUnique(error, 'Ya existe un usuario registrado con ese ID o correo electrónico');
            throw error;
        }
    }
    async update(userId, input) {
        const existing = await this.get(userId);
        if (input.roleId)
            await this.ensureRole(input.roleId);
        const idValue = input.idUsuario?.trim();
        const hasEmail = input.email !== undefined && input.email.trim() !== '';
        const targetEmail = hasEmail
            ? input.email.trim().toLocaleLowerCase()
            : idValue && existing.email.endsWith('@msa.local')
                ? `${idValue}@msa.local`.toLocaleLowerCase()
                : undefined;
        const hasPassword = input.password !== undefined && input.password.trim().length >= 8;
        const passwordHash = hasPassword ? await bcrypt.hash(input.password.trim(), 12) : undefined;
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
                if (idValue) {
                    const existingEmployee = await transaction.employee.findUnique({
                        where: { userId }
                    });
                    if (existingEmployee) {
                        await transaction.employee.update({
                            where: { userId },
                            data: { employeeCode: idValue }
                        });
                    }
                    else {
                        const defaultCompany = await transaction.company.findFirst();
                        if (defaultCompany) {
                            await transaction.employee.create({
                                data: {
                                    userId,
                                    companyId: defaultCompany.id,
                                    employeeCode: idValue,
                                    hiredAt: new Date(),
                                    active: true
                                }
                            });
                        }
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
                }));
            });
        }
        catch (error) {
            this.throwConflictIfUnique(error, 'Ya existe un usuario registrado con ese ID o correo electrónico');
            throw error;
        }
    }
    async setStatus(userId, status) {
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
    async resetPassword(userId, newPassword) {
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
    async remove(userId) {
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
    async assignRole(userId, roleId) {
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
    async replacePermissions(userId, permissionIds) {
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
    async ensureRole(roleId) {
        const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
        if (!role)
            throw new AppError(404, 'Rol no encontrado');
    }
    async ensurePermissions(permissionIds) {
        if (!permissionIds.length)
            return;
        const permissions = await prisma.permission.findMany({
            where: { id: { in: permissionIds } },
            select: { id: true }
        });
        if (permissions.length !== permissionIds.length)
            throw new AppError(404, 'Uno o más permisos no existen');
    }
    throwConflictIfUnique(error, message) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
            throw new AppError(409, message);
    }
}
//# sourceMappingURL=user-management-service.js.map