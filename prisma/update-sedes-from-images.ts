import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const assignments: { dni: string; name: string; sede: 'CAJ' | 'BANOS' | 'NONE' }[] = [
  // LOCACIÓN
  { dni: '26730088', name: 'ARTEAGA VARGAS AURORA RAQUEL', sede: 'CAJ' },
  { dni: '45459273', name: 'BARDALES ZEGARRA SAMANTHA DEL CARMEN GIULLIANA', sede: 'BANOS' },
  { dni: '75057288', name: 'CELIS ALVA YULISA', sede: 'CAJ' },
  { dni: '71619898', name: 'CHILON TAFUR ROBER IVAN', sede: 'CAJ' },
  { dni: '61025470', name: 'CHUNQUI CUALQUI DANIEL', sede: 'CAJ' },
  { dni: '26651015', name: 'DE LOS SANTOS BAZAN JAVIER', sede: 'CAJ' },
  { dni: '48590372', name: 'LEÓN ZÀRATE MARDELY YESSENIA', sede: 'CAJ' },
  { dni: '72021197', name: 'LOZANO SOTO JHOSEP ISAAC', sede: 'CAJ' },
  { dni: '43665460', name: 'MENDOZA VIGO ROSA VICTORIA', sede: 'CAJ' },
  { dni: '70206012', name: 'MESTANZA INCIO CRISTHIAN RODRIGO', sede: 'BANOS' },
  { dni: '46675573', name: 'MISAHUAMAN TONGO ROBERTO', sede: 'CAJ' },
  { dni: '71089425', name: 'QUERZOLA SALAS CECILIA MARLENI', sede: 'CAJ' },
  { dni: '46700887', name: 'RAMIREZ LLICO SANDRO RAFAEL', sede: 'CAJ' },
  { dni: '75106928', name: 'URIARTE SÁNCHEZ NELLY ALEJANDRA', sede: 'BANOS' },
  { dni: '75001440', name: 'ZAMORA TANTA DECIDERIO', sede: 'CAJ' },

  // CARROCEROS PERUANOS
  { dni: '45450623', name: 'MESTANZA DIAZ MARLON IVAN', sede: 'CAJ' },
  { dni: '26721517', name: 'RUMAY DE LOS SANTOS VICTOR', sede: 'CAJ' },
  { dni: '48615703', name: 'SANCHEZ GASTOLOMENDO JHONY DANIEL', sede: 'BANOS' },

  // MSA AUTOMOTRIZ
  { dni: '71330024', name: 'ARAUJO ESCALANTE ADRIANA DEL CARMEN', sede: 'CAJ' },
  { dni: '46154049', name: 'CABRERA GAITAN JOSE LUIS', sede: 'CAJ' },
  { dni: '73872889', name: 'CALLA GOMEZ LIZETH DEL CARMEN', sede: 'BANOS' },
  { dni: '43597929', name: 'CHAVEZ BECERRA LUIS ALEXANDER', sede: 'CAJ' },
  { dni: '45453512', name: 'CUSMA CASTILLO JUDITH MERCEDES', sede: 'CAJ' },
  { dni: '77493617', name: 'ESTELA YDROGO JEAN CARLOS', sede: 'CAJ' },
  { dni: '74317758', name: 'FLORES TARRILLO BRRIANA NASHELY', sede: 'BANOS' },
  { dni: '76223446', name: 'GONZALES GOICOCHEA WILLIAN IVAN', sede: 'BANOS' },
  { dni: '73893418', name: 'LEON ZARATE MELISSA IDALY', sede: 'BANOS' },
  { dni: '71954250', name: 'LLANOS CORTEZ NELY AYDEE', sede: 'CAJ' },
  { dni: '42176733', name: 'MALAVER SALAZAR PAOLO JUNNIOR EDGARDO', sede: 'NONE' },
  { dni: '46187034', name: 'MOYA GUZMAN HOLBEIN HAWY', sede: 'CAJ' },
  { dni: '72565567', name: 'PEREGRINO CHILON GABY YESSENIA LUPITA', sede: 'CAJ' },
  { dni: '46703860', name: 'PULCHA RAMOS LUIS EDUARDO', sede: 'NONE' },
  { dni: '72658373', name: 'SATTUI SILVA SANTISTEBAN SILVANA', sede: 'BANOS' },
  { dni: '44791200', name: 'SOTO AQUINO JOSE SMITH', sede: 'BANOS' },
  { dni: '45253412', name: 'TERAN HUAMAN JOSE MANUEL', sede: 'BANOS' },

  // MSA CORPORACIÓN
  { dni: '74281096', name: 'AGUILAR MEDINA ANGEL JHONNY', sede: 'BANOS' },
  { dni: '41905995', name: 'CALDERON CABRERA DAVID', sede: 'BANOS' },
  { dni: '74389811', name: 'CALDERON TACILLA SEGUNDO FIDEL', sede: 'CAJ' },
  { dni: '75983856', name: 'MINCHAN CALDERON CRISTIAN OMAR', sede: 'CAJ' },
  { dni: '74832641', name: 'MORI VASQUEZ JUAQUIN JAREN', sede: 'BANOS' },
  { dni: '72324541', name: 'NOVOA RODRIGUEZ KATHERINE MAYRIN', sede: 'BANOS' },
  { dni: '76846025', name: 'QUILCATE HERRERA YEYLI ALMENDRA', sede: 'CAJ' },
  { dni: '73954257', name: 'RAMIREZ TERAN DAMARIS EUNICE', sede: 'BANOS' },
  { dni: '71830163', name: 'RUMAY COTRINA LUIS ANGEL', sede: 'CAJ' },
  { dni: '75161760', name: 'RUMAY SANJINEZ DAMARIS AIAEL', sede: 'CAJ' },
  { dni: '75590444', name: 'SALAZAR BARDALES ANA EDITH', sede: 'BANOS' },
  { dni: '76383213', name: 'SALAZAR BARDALES EDWIN RAUL', sede: 'BANOS' },
  { dni: '26708926', name: 'SANCHEZ LEZAMA SARITA BETTY', sede: 'CAJ' },
  { dni: '74481505', name: 'SOTO GONZALES ABRAHAM', sede: 'CAJ' },
  { dni: '71707230', name: 'VIGO GIL EDWAR JHOEL', sede: 'CAJ' },

  // MSA CORP
  { dni: '71200821', name: 'ALCANTARA CABRERA DAMNA RAQUEL', sede: 'BANOS' },
  { dni: '71513094', name: 'ALCANTARA LUCANO MAGYRIN PAOLA', sede: 'BANOS' },
  { dni: '47861844', name: 'BERMEO RIVERA JOSE LEONARD PAUL', sede: 'CAJ' },
  { dni: '73266073', name: 'GUEVARA CELIS YAQUELIN', sede: 'CAJ' },
  { dni: '71545481', name: 'RAMIREZ MANTILLA KATHERINE ELIZABETH', sede: 'CAJ' },
  { dni: '75018511', name: 'REYES CASAS DIANA LAURA', sede: 'CAJ' },
  { dni: '45036515', name: 'SANGAY LULICHAC HERBER', sede: 'CAJ' },
  { dni: '71082797', name: 'TENORIO DIAZ LEINI HENRY', sede: 'CAJ' },
  { dni: '46516311', name: 'VIGO GALARRETA FANY AYDEE', sede: 'CAJ' },
  { dni: '41271115', name: 'VILLANUEVA FERNANDEZ MAGDA LIZBETH', sede: 'BANOS' },
  { dni: '74830451', name: 'ZELADA LUCANO ORLANDO', sede: 'CAJ' }
];

async function main() {
  const siteCajamarca = await prisma.site.findFirst({
    where: { name: { contains: 'Cajamarca' } }
  });
  const siteBanos = await prisma.site.findFirst({
    where: { name: { contains: 'Baños' } }
  });

  if (!siteCajamarca || !siteBanos) {
    throw new Error('No se encontraron las sedes Cajamarca o Baños del Inca');
  }

  console.log(`Sede Cajamarca: ${siteCajamarca.id} (${siteCajamarca.name})`);
  console.log(`Sede Baños del Inca: ${siteBanos.id} (${siteBanos.name})`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const item of assignments) {
    const targetSiteId =
      item.sede === 'CAJ'
        ? siteCajamarca.id
        : item.sede === 'BANOS'
          ? siteBanos.id
          : null;

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeCode: item.dni },
          { user: { email: `${item.dni}@msaautomotriz.com` } },
          { user: { email: `${item.dni}@msa.local` } }
        ]
      },
      include: { user: true }
    });

    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { siteId: targetSiteId }
      });
      console.log(`✅ [${item.dni}] ${item.name} -> Sede: ${item.sede} (${targetSiteId ? (item.sede === 'CAJ' ? 'Cajamarca' : 'Baños del Inca') : 'Sin sede'})`);
      updatedCount++;
    } else {
      console.log(`⚠️ No se encontró empleado con DNI: ${item.dni} (${item.name})`);
      notFoundCount++;
    }
  }

  console.log(`\nResumen: ${updatedCount} actualizados, ${notFoundCount} no encontrados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
