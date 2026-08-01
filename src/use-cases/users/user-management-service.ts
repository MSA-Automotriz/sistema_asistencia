import bcrypt from 'bcrypt';
import { Prisma, UserStatus } from '@prisma/client';
import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';

export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  status?: UserStatus;
};

export type UpdateUserInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
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
    try {
      return await prisma.user.create({
        data: {
          email: input.email.toLocaleLowerCase(),
          passwordHash: await bcrypt.hash(input.password, 12),
          firstName: input.firstName,
          lastName: input.lastName,
          roleId: input.roleId,
          status: input.status ?? UserStatus.PENDING
        },
        select: userDetails
      });
    } catch (error) {
      this.throwConflictIfUnique(error, 'Ya existe un usuario con ese correo electrónico');
      throw error;
    }
  }

  async update(userId: string, input: UpdateUserInput) {
    await this.get(userId);
    if (input.roleId) await this.ensureRole(input.roleId);
    try {
      return await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({
          where: { id: userId },
          data: {
            email: input.email?.toLocaleLowerCase(),
            firstName: input.firstName,
            lastName: input.lastName,
            roleId: input.roleId
          },
          select: userDetails
        });
        if (input.roleId)
          await transaction.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        return user;
      });
    } catch (error) {
      this.throwConflictIfUnique(error, 'Ya existe un usuario con ese correo electrónico');
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
    await prisma.user.delete({ where: { id: userId } });
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
