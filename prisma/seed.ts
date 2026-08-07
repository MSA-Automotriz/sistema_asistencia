import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();
const roles = ['Administrador', 'Gerente', 'Supervisor', 'Recursos Humanos', 'Empleado'];
const resources = [
  'users',
  'roles',
  'permissions',
  'companies',
  'sites',
  'departments',
  'positions',
  'schedules',
  'site-schedules',
  'employees',
  'attendances',
  'vacations',
  'work-permissions',
  'overtime-requests',
  'licenses',
  'holidays',
  'settings',
  'notifications',
  'announcements',
  'devices',
  'qr',
  'reports',
  'statistics',
  'calendar',
  'audit-logs',
  'system-logs',
  'backups',
  'maintenance',
  'imports',
  'dashboard'
];

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador' },
    update: {},
    create: { name: 'Administrador', description: 'Acceso total al sistema' }
  });
  for (const roleName of roles.filter((name) => name !== 'Administrador'))
    await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
  const permissions = await Promise.all(
    resources.flatMap((resource) =>
      ['read', 'create', 'update', 'delete'].map((action) =>
        prisma.permission.upsert({
          where: { code: `${resource}.${action}` },
          update: {},
          create: { code: `${resource}.${action}`, description: `${action} ${resource}` }
        })
      )
    )
  );
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
    skipDuplicates: true
  });
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@msaautomotriz.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@msaautomotriz.com',
      passwordHash,
      firstName: 'Administrador',
      lastName: 'MSA',
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
      emailVerifiedAt: new Date()
    }
  });
}
main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
