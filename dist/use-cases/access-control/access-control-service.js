import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../database/prisma.js';
export class AccessControlService {
    async rolePermissions(roleId) {
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            select: {
                id: true,
                name: true,
                description: true,
                rolePermissions: {
                    select: { permission: { select: { id: true, code: true, description: true } } }
                }
            }
        });
        if (!role)
            throw new AppError(404, 'Rol no encontrado');
        return role;
    }
    async replaceRolePermissions(roleId, permissionIds) {
        await this.rolePermissions(roleId);
        const uniquePermissionIds = [...new Set(permissionIds)];
        if (uniquePermissionIds.length) {
            const permissions = await prisma.permission.findMany({
                where: { id: { in: uniquePermissionIds } },
                select: { id: true }
            });
            if (permissions.length !== uniquePermissionIds.length)
                throw new AppError(404, 'Uno o más permisos no existen');
        }
        await prisma.$transaction([
            prisma.rolePermission.deleteMany({ where: { roleId } }),
            prisma.rolePermission.createMany({
                data: uniquePermissionIds.map((permissionId) => ({ roleId, permissionId }))
            }),
            prisma.session.updateMany({
                where: { revokedAt: null, user: { is: { roleId } } },
                data: { revokedAt: new Date() }
            })
        ]);
        return this.rolePermissions(roleId);
    }
}
//# sourceMappingURL=access-control-service.js.map