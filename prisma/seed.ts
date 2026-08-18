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
  // 1. Roles y Permisos de Administrador
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador' },
    update: {},
    create: { name: 'Administrador', description: 'Acceso total al sistema' }
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'Empleado' },
    update: {},
    create: { name: 'Empleado', description: 'Acceso portal de empleado y registro de asistencia' }
  });

  for (const roleName of roles.filter((name) => !['Administrador', 'Empleado'].includes(name))) {
    await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
  }

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

  // 2. Empresa Semilla Principal
  const company = await prisma.company.upsert({
    where: { taxId: '20123456789' },
    update: {},
    create: {
      name: 'MSA Automotriz S.A.C.',
      taxId: '20123456789',
      email: 'contacto@msaautomotriz.com',
      phone: '+51 1 555-0199',
      address: 'Av. Los Automotores 123, Lima',
      timeZone: 'America/Lima',
      active: true
    }
  });

  // 3. Sede Principal con Geocerca (-12.046374, -77.042793, 100m)
  const site = await prisma.site.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Sede Principal MSA' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Sede Principal MSA',
      address: 'Av. Los Automotores 123, Lima',
      latitude: -12.046374,
      longitude: -77.042793,
      radiusMeters: 100,
      active: true
    }
  });

  // 4. Área, Cargo y Horario General
  const department = await prisma.department.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Operaciones' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Operaciones',
      description: 'Área operativa y administrativa'
    }
  });

  const position = await prisma.position.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Especialista de Asistencia' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Especialista de Asistencia',
      description: 'Personal operativo'
    }
  });

  let schedule = await prisma.schedule.findFirst({ where: { name: 'Jornada Completa 8am - 5pm' } });
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        name: 'Jornada Completa 8am - 5pm',
        type: 'NORMAL',
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        flexibleWindowMinutes: 0,
        workDays: JSON.stringify([1, 2, 3, 4, 5]),
        active: true
      }
    });
  }

  await prisma.siteSchedule.upsert({
    where: { siteId_scheduleId: { siteId: site.id, scheduleId: schedule.id } },
    update: {},
    create: { siteId: site.id, scheduleId: schedule.id, active: true }
  });

  // 5. Usuario Administrador Inicial
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const adminUser = await prisma.user.upsert({
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

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {
      companyId: company.id,
      siteId: site.id,
      departmentId: department.id,
      positionId: position.id,
      scheduleId: schedule.id
    },
    create: {
      userId: adminUser.id,
      companyId: company.id,
      siteId: site.id,
      departmentId: department.id,
      positionId: position.id,
      scheduleId: schedule.id,
      employeeCode: 'EMP-0001',
      hiredAt: new Date(),
      active: true
    }
  });

  // 6. Asignar Sede Principal a todos los empleados sin sede asignada en la DB
  const unassignedEmployees = await prisma.employee.findMany({ where: { siteId: null } });
  for (const emp of unassignedEmployees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        companyId: company.id,
        siteId: site.id,
        departmentId: department.id,
        positionId: position.id,
        scheduleId: schedule.id
      }
    });
  }

  // 7. Anuncio Corporativo Semilla
  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { companyId: company.id, title: '¡Bienvenidos al Sistema de Asistencia MSA!' }
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        companyId: company.id,
        title: '¡Bienvenidos al Sistema de Asistencia MSA!',
        body: 'El sistema de marcación de asistencia con geocerca GPS se encuentra activo. Recuerda marcar tu entrada y salida desde la sede autorizada.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: adminUser.id
      }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
