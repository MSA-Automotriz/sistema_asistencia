import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();
const roles = ['Administrador', 'Gerente', 'Supervisor', 'Recursos Humanos', 'Empleado'];
const resources = ['users', 'roles', 'permissions', 'companies', 'sites', 'departments', 'positions', 'schedules', 'employees', 'attendances', 'vacations', 'work-permissions', 'licenses', 'holidays', 'settings', 'notifications', 'qr', 'dashboard'];

async function main() {
  const adminRole = await prisma.role.upsert({ where: { name: 'Administrador' }, update: {}, create: { name: 'Administrador', description: 'Acceso total al sistema' } });
  for (const role of roles.filter((name) => name !== 'Administrador')) await prisma.role.upsert({ where: { name: role }, update: {}, create: { name } });
  const permissions = await Promise.all(resources.flatMap((resource) => ['read', 'create', 'update', 'delete'].map((action) => prisma.permission.upsert({ where: { code: `${resource}.${action}` }, update: {}, create: { code: `${resource}.${action}`, description: `${action} ${resource}` } }))));
  await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })), skipDuplicates: true });
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({ where: { email: 'admin@msaautomotriz.com' }, update: { roleId: adminRole.id }, create: { email: 'admin@msaautomotriz.com', passwordHash, firstName: 'Administrador', lastName: 'MSA', status: UserStatus.ACTIVE, roleId: adminRole.id, emailVerifiedAt: new Date() } });
}
main().then(() => prisma.$disconnect()).catch(async (error: unknown) => { console.error(error); await prisma.$disconnect(); process.exit(1); });