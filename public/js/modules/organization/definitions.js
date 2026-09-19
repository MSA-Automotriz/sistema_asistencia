import { state } from '../../core/state.js';
import { fullName } from '../../core/utils.js';

export const organizationDefinitions = {
  companies: {
    label: 'Empresas',
    searchPlaceholder: 'Buscar empresa por nombre, RUC...',
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
    searchPlaceholder: 'Buscar sede por nombre, dirección...',
    endpoint: '/sites',
    columns: [
      ['Nombre', (item) => item.name],
      [
        'Empresa',
        (item) =>
          state.organizationReferences?.companies?.find((c) => c.id === item.companyId)?.name ||
          item.companyId
      ],
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
    searchPlaceholder: 'Buscar área por nombre...',
    endpoint: '/departments',
    columns: [
      ['Área', (item) => item.name],
      [
        'Empresa',
        (item) =>
          state.organizationReferences?.companies?.find((c) => c.id === item.companyId)?.name ||
          item.companyId
      ],
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
    searchPlaceholder: 'Buscar cargo por nombre...',
    endpoint: '/positions',
    columns: [
      ['Cargo', (item) => item.name],
      [
        'Empresa',
        (item) =>
          state.organizationReferences?.companies?.find((c) => c.id === item.companyId)?.name ||
          item.companyId
      ],
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
    searchPlaceholder: 'Buscar horario por nombre o tipo...',
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
    searchPlaceholder: 'Buscar empleado por código, nombre, área, horario...',
    endpoint: '/employees',
    createEndpoint: '/employees/provision',
    updateEndpoint: '/employees/:id/assignments',
    columns: [
      ['Código', (item) => item.employeeCode],
      [
        'Usuario',
        (item) => {
          const user = state.organizationReferences?.users?.find((u) => u.id === item.userId);
          if (!user) return item.userId;
          const name = fullName(user);
          return user.email && !user.email.endsWith('@msa.local')
            ? `${name} (${user.email})`
            : name;
        }
      ],
      [
        'Empresa',
        (item) =>
          state.organizationReferences?.companies?.find((c) => c.id === item.companyId)?.name ||
          item.companyId
      ],
      [
        'Área',
        (item) =>
          state.organizationReferences?.departments?.find((d) => d.id === item.departmentId)?.name ||
          '-'
      ],
      [
        'Horario',
        (item) =>
          state.organizationReferences?.schedules?.find((s) => s.id === item.scheduleId)?.name ||
          '-'
      ],
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
      {
        name: 'birthDate',
        label: 'Fecha de nacimiento',
        type: 'date',
        optional: true
      },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  },
  'site-schedules': {
    label: 'Horarios por sede',
    searchPlaceholder: 'Buscar horario por sede...',
    endpoint: '/site-schedules',
    columns: [
      [
        'Sede',
        (item) =>
          state.organizationReferences?.sites?.find((s) => s.id === item.siteId)?.name ||
          item.siteId
      ],
      [
        'Horario',
        (item) =>
          state.organizationReferences?.schedules?.find((s) => s.id === item.scheduleId)?.name ||
          item.scheduleId
      ],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      { name: 'siteId', label: 'Sede', kind: 'select', source: 'sites', required: true },
      { name: 'scheduleId', label: 'Horario', kind: 'select', source: 'schedules', required: true },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  }
};
