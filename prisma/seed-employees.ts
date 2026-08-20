import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

// DNI se usa como employeeCode (usuario de acceso) y como contraseña inicial.
type EmployeeSeed = { dni: string; lastName: string; firstName: string };

const employees: EmployeeSeed[] = [
  { dni: '71330024', lastName: 'Araujo Escalante', firstName: 'Adriana Del Carmen' },
  { dni: '46154049', lastName: 'Cabrera Gaitan', firstName: 'Jose Luis' },
  { dni: '73872889', lastName: 'Calla Gomez', firstName: 'Lizeth Del Carmen' },
  { dni: '43597929', lastName: 'Chavez Becerra', firstName: 'Luis Alexander' },
  { dni: '45453512', lastName: 'Cusma Castillo', firstName: 'Judith Mercedes' },
  { dni: '73954257', lastName: 'Ramirez Teran', firstName: 'Damaris Eunice' },
  { dni: '77493617', lastName: 'Estela Ydrogo', firstName: 'Jean Carlos' },
  { dni: '74317758', lastName: 'Flores Tarrillo', firstName: 'Brriana Nashely' },
  { dni: '76223446', lastName: 'Gonzales Goicochea', firstName: 'Willian Ivan' },
  { dni: '73893418', lastName: 'Leon Zarate', firstName: 'Melissa Idaly' },
  { dni: '71954250', lastName: 'Llanos Cortez', firstName: 'Nely Aydee' },
  { dni: '42176733', lastName: 'Malaver Salazar', firstName: 'Paolo Junnior Edgardo' },
  { dni: '46187034', lastName: 'Moya Guzman', firstName: 'Holbein Hawy' },
  { dni: '72565567', lastName: 'Peregrino Chilon', firstName: 'Gaby Yessenia Lupita' },
  { dni: '46703860', lastName: 'Pulcha Ramos', firstName: 'Luis Eduardo' },
  { dni: '72658373', lastName: 'Sattui Silva', firstName: 'Santisteban Silvana' },
  { dni: '44791200', lastName: 'Soto Aquino', firstName: 'Jose Smith' },
  { dni: '45253412', lastName: 'Teran Huaman', firstName: 'Jose Manuel' },

  { dni: '71200821', lastName: 'Alcantara Cabrera', firstName: 'Damna Raquel' },
  { dni: '71513094', lastName: 'Alcantara Lucano', firstName: 'Magyrin Paola' },
  { dni: '71570190', lastName: 'Bazan Flores', firstName: 'Antony Arturo Agustin' },
  { dni: '47861844', lastName: 'Bermeo Rivera', firstName: 'Jose Leonard Paul' },
  { dni: '73266073', lastName: 'Guevara Celis', firstName: 'Yaquelin' },
  { dni: '71545481', lastName: 'Ramirez Mantilla', firstName: 'Katherine Elizabeth' },
  { dni: '75018511', lastName: 'Reyes Casas', firstName: 'Diana Laura' },
  { dni: '45036515', lastName: 'Sangay Lulichac', firstName: 'Herber' },
  { dni: '71082797', lastName: 'Tenorio Diaz', firstName: 'Leini Henry' },
  { dni: '46516311', lastName: 'Vigo Galarreta', firstName: 'Fany Aydee' },
  { dni: '41271115', lastName: 'Villanueva Fernandez', firstName: 'Magda Lizbeth' },
  { dni: '74830451', lastName: 'Zelada Lucano', firstName: 'Orlando' },

  { dni: '74281096', lastName: 'Aguilar Medina', firstName: 'Angel Jhonny' },
  { dni: '41905995', lastName: 'Calderon Cabrera', firstName: 'David' },
  { dni: '74389811', lastName: 'Calderon Tacilla', firstName: 'Segundo Fidel' },
  { dni: '75983856', lastName: 'Minchan Calderon', firstName: 'Cristian Omar' },
  { dni: '74832641', lastName: 'Mori Vasquez', firstName: 'Juaquin Jaren' },
  { dni: '72324541', lastName: 'Novoa Rodriguez', firstName: 'Katherine Mayrin' },
  { dni: '76846025', lastName: 'Quilcate Herrera', firstName: 'Yeyli Almendra' },
  { dni: '71830163', lastName: 'Rumay Cotrina', firstName: 'Luis Angel' },
  { dni: '75161760', lastName: 'Rumay Sanjinez', firstName: 'Damaris Aiael' },
  { dni: '75590444', lastName: 'Salazar Bardales', firstName: 'Ana Edith' },
  { dni: '76383213', lastName: 'Salazar Bardales', firstName: 'Edwin Raul' },
  { dni: '26708926', lastName: 'Sanchez Lezama', firstName: 'Sarita Betty' },
  { dni: '74481505', lastName: 'Soto Gonzales', firstName: 'Abraham' },

  { dni: '45450623', lastName: 'Mestanza Diaz', firstName: 'Marlon Ivan' },
  { dni: '26721517', lastName: 'Rumay De Los Santos', firstName: 'Victor' },
  { dni: '48615703', lastName: 'Sanchez Gastolomendo', firstName: 'Jhony Daniel' },

  { dni: '26730088', lastName: 'Arteaga Vargas', firstName: 'Aurora Raquel' },
  { dni: '45459273', lastName: 'Bardales Zegarra', firstName: 'Samantha Del Carmen Giulliana' },
  { dni: '75057288', lastName: 'Celis Alva', firstName: 'Yulisa' },
  { dni: '61025470', lastName: 'Chunqui Cualqui', firstName: 'Daniel' },
  { dni: '26651015', lastName: 'De Los Santos Bazan', firstName: 'Javier' },
  { dni: '48590372', lastName: 'Leon Zarate', firstName: 'Mardely Yessenia' },
  { dni: '72021197', lastName: 'Lozano Soto', firstName: 'Jhosep Isaac' },
  { dni: '43665460', lastName: 'Mendoza Vigo', firstName: 'Rosa Victoria' },
  { dni: '70206012', lastName: 'Mestanza Incio', firstName: 'Cristhian Rodrigo' },
  { dni: '46675573', lastName: 'Misahuaman Tongo', firstName: 'Roberto' },
  { dni: '71089425', lastName: 'Querzola Salas', firstName: 'Cecilia Marleni' },
  { dni: '75111902', lastName: 'Ramirez Sanchez', firstName: 'Edinson Humberto' },
  { dni: '46700887', lastName: 'Ramirez Llico', firstName: 'Sandro Rafael' },
  { dni: '75106928', lastName: 'Uriarte Sanchez', firstName: 'Nelly Alejandra' },
  { dni: '71707230', lastName: 'Vigo Gil', firstName: 'Edwar Jhoel' },
  { dni: '75001440', lastName: 'Zamora Tanta', firstName: 'Deciderio' },
  { dni: '75100445', lastName: 'Vigo Perez', firstName: 'Emilio Enrique' }
];

async function main() {
  const employeeRole = await prisma.role.upsert({
    where: { name: 'Empleado' },
    update: {},
    create: { name: 'Empleado', description: 'Acceso portal de empleado y registro de asistencia' }
  });

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

  let created = 0;
  for (const emp of employees) {
    const email = `${emp.dni}@msaautomotriz.com`;
    const passwordHash = await bcrypt.hash(emp.dni, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: { roleId: employeeRole.id },
      create: {
        email,
        passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        status: UserStatus.ACTIVE,
        roleId: employeeRole.id,
        emailVerifiedAt: new Date()
      }
    });

    await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        companyId: company.id,
        siteId: site.id,
        departmentId: department.id,
        positionId: position.id,
        scheduleId: schedule.id
      },
      create: {
        userId: user.id,
        companyId: company.id,
        siteId: site.id,
        departmentId: department.id,
        positionId: position.id,
        scheduleId: schedule.id,
        employeeCode: emp.dni,
        hiredAt: new Date(),
        active: true
      }
    });
    created += 1;
  }

  console.log(`Empleados procesados: ${created}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
