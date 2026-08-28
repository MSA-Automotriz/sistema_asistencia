export const organizationDefinitions = {
  companies: {
    label: 'Empresas',
    endpoint: '/companies',
    columns: [
      ['Nombre', (item) => item.name],
      ['RUC / ID fiscal', (item) => item.taxId],
      ['Zona horaria', (item) => item.timeZone],
      ['Estado', (item) => (item.active ? 'Activa' : 'Inactiva')]
    ],
    fields: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'taxId', label: 'RUC / ID fiscal', required: true },
      { name: 'timeZone', label: 'Zona horaria', defaultValue: 'America/Lima' },
      { name: 'email', label: 'Correo', type: 'email' },
      { name: 'phone', label: 'Teléfono' },
      { name: 'address', label: 'Dirección', wide: true },
      { name: 'active', label: 'Activa', kind: 'checkbox', defaultValue: true }
    ]
  },
  sites: {
    label: 'Sedes',
    endpoint: '/sites',
    columns: [
      ['Nombre', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Dirección', (item) => item.address],
      ['Radio', (item) => `${item.radiusMeters} m`],
      ['Estado', (item) => (item.active ? 'Activa' : 'Inactiva')]
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre de sede', required: true },
      { name: 'address', label: 'Dirección', wide: true, required: true },
      { name: 'latitude', label: 'Latitud', type: 'number', step: 'any', required: true },
      { name: 'longitude', label: 'Longitud', type: 'number', step: 'any', required: true },
      {
        name: 'radiusMeters',
        label: 'Radio permitido (m)',
        type: 'number',
        defaultValue: 10,
        required: true
      },
      { name: 'active', label: 'Activa', kind: 'checkbox', defaultValue: true }
    ]
  },
  departments: {
    label: 'Áreas',
    endpoint: '/departments',
    columns: [
      ['Área', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Descripción', (item) => item.description || '-']
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', wide: true }
    ]
  },
  positions: {
    label: 'Cargos',
    endpoint: '/positions',
    columns: [
      ['Cargo', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Descripción', (item) => item.description || '-']
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', wide: true }
    ]
  },
  schedules: {
    label: 'Horarios',
    endpoint: '/schedules',
    columns: [
      ['Horario', (item) => item.name],
      ['Tipo', (item) => item.type],
      ['Entrada', (item) => item.startTime],
      ['Salida', (item) => item.endTime],
      ['Tolerancia', (item) => `${item.toleranceMinutes} min`],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      { name: 'name', label: 'Nombre', required: true },
      {
        name: 'type',
        label: 'Tipo',
        kind: 'select',
        options: ['NORMAL', 'NIGHT', 'ROTATING', 'PART_TIME', 'FLEXIBLE'],
        required: true
      },
      { name: 'startTime', label: 'Hora de entrada', type: 'time', required: true },
      { name: 'endTime', label: 'Hora de salida', type: 'time', required: true },
      {
        name: 'toleranceMinutes',
        label: 'Tolerancia (min)',
        type: 'number',
        defaultValue: 0,
        required: true
      },
      {
        name: 'flexibleWindowMinutes',
        label: 'Ventana flexible (min)',
        type: 'number',
        defaultValue: 0
      },
      { name: 'breakStartTime', label: 'Inicio de descanso', type: 'time' },
      { name: 'breakEndTime', label: 'Fin de descanso', type: 'time' },
      { name: 'breakMinutes', label: 'Descanso (min)', type: 'number', defaultValue: 0 },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  },
  employees: {
    label: 'Empleados',
    endpoint: '/employees',
    createEndpoint: '/employees/provision',
    updateEndpoint: '/employees/:id/assignments',
    columns: [
      ['Código', (item) => item.employeeCode],
      ['Usuario', (item) => item.userId],
      ['Empresa', (item) => item.companyId],
      ['Área', (item) => item.departmentId || '-'],
      ['Horario', (item) => item.scheduleId || '-'],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      {
        name: 'userId',
        label: 'Usuario',
        kind: 'select',
        source: 'users',
        required: true,
        createOnly: true
      },
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'employeeCode', label: 'Código de empleado', required: true },
      { name: 'siteId', label: 'Sede', kind: 'select', source: 'sites', optional: true },
      {
        name: 'departmentId',
        label: 'Área',
        kind: 'select',
        source: 'departments',
        optional: true
      },
      { name: 'positionId', label: 'Cargo', kind: 'select', source: 'positions', optional: true },
      { name: 'scheduleId', label: 'Horario', kind: 'select', source: 'schedules', optional: true },
      {
        name: 'supervisorId',
        label: 'Supervisor',
        kind: 'select',
        source: 'employees',
        optional: true
      },
      {
        name: 'hiredAt',
        label: 'Fecha de ingreso',
        type: 'date',
        required: true,
        defaultValue: () => new Date().toISOString().slice(0, 10)
      },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  },
  'site-schedules': {
    label: 'Horarios por sede',
    endpoint: '/site-schedules',
    columns: [
      ['Sede', (item) => item.siteId],
      ['Horario', (item) => item.scheduleId],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      { name: 'siteId', label: 'Sede', kind: 'select', source: 'sites', required: true },
      { name: 'scheduleId', label: 'Horario', kind: 'select', source: 'schedules', required: true },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  }
};
