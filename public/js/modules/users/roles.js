import { state } from '../../core/state.js';
import { query, queryAll, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';

export const PERMISSION_LABELS = {
  // Módulo Dashboard y Análisis
  'dashboard.read': {
    title: 'Ver Panel Ejecutivo (Métricas globales)',
    category: 'Dashboard y Análisis'
  },
  'statistics.read': {
    title: 'Ver Estadísticas e Indicadores',
    category: 'Dashboard y Análisis'
  },
  'reports.read': {
    title: 'Generar y Exportar Reportes (PDF/Excel)',
    category: 'Dashboard y Análisis'
  },
  'calendar.read': {
    title: 'Ver Calendario Operativo de Asistencias',
    category: 'Dashboard y Análisis'
  },

  // Módulo Control de Asistencia
  'attendances.read': {
    title: 'Ver Registros de Asistencia de Personal',
    category: 'Control de Asistencia'
  },
  'attendances.create': {
    title: 'Registrar Entrada / Salida de Asistencia',
    category: 'Control de Asistencia'
  },
  'attendances.update': {
    title: 'Editar Marcas de Asistencia',
    category: 'Control de Asistencia'
  },
  'attendances.delete': {
    title: 'Eliminar Registros de Asistencia',
    category: 'Control de Asistencia'
  },
  'qr.read': { title: 'Ver Códigos QR e Historial de Sede', category: 'Control de Asistencia' },
  'qr.create': { title: 'Generar Códigos QR de Sede', category: 'Control de Asistencia' },

  // Módulo Solicitudes y Permisos
  'work-permissions.read': {
    title: 'Ver Solicitudes de Permisos de Trabajo',
    category: 'Solicitudes y Permisos'
  },
  'work-permissions.create': {
    title: 'Crear Permisos de Trabajo',
    category: 'Solicitudes y Permisos'
  },
  'work-permissions.update': {
    title: 'Aprobar o Rechazar Permisos de Trabajo',
    category: 'Solicitudes y Permisos'
  },
  'work-permissions.delete': {
    title: 'Eliminar Solicitudes de Permisos',
    category: 'Solicitudes y Permisos'
  },
  'overtime-requests.read': {
    title: 'Ver Solicitudes de Horas Extra',
    category: 'Solicitudes y Permisos'
  },
  'overtime-requests.create': {
    title: 'Solicitar Horas Extra',
    category: 'Solicitudes y Permisos'
  },
  'overtime-requests.update': {
    title: 'Aprobar o Rechazar Horas Extra',
    category: 'Solicitudes y Permisos'
  },
  'overtime-requests.delete': {
    title: 'Eliminar Solicitudes de Horas Extra',
    category: 'Solicitudes y Permisos'
  },
  'vacations.read': {
    title: 'Ver Solicitudes de Vacaciones',
    category: 'Solicitudes y Permisos'
  },
  'vacations.create': { title: 'Solicitar Vacaciones', category: 'Solicitudes y Permisos' },
  'vacations.update': {
    title: 'Aprobar o Rechazar Vacaciones',
    category: 'Solicitudes y Permisos'
  },
  'vacations.delete': {
    title: 'Eliminar Solicitudes de Vacaciones',
    category: 'Solicitudes y Permisos'
  },
  'licenses.read': {
    title: 'Ver Licencias Médicas / Especiales',
    category: 'Solicitudes y Permisos'
  },
  'licenses.create': {
    title: 'Registrar Licencias Médicas',
    category: 'Solicitudes y Permisos'
  },
  'licenses.update': {
    title: 'Aprobar o Rechazar Licencias',
    category: 'Solicitudes y Permisos'
  },
  'licenses.delete': { title: 'Eliminar Licencias Médicas', category: 'Solicitudes y Permisos' },

  // Módulo Personal y Empleados
  'employees.read': { title: 'Ver Lista de Empleados', category: 'Gestión de Personal' },
  'employees.create': { title: 'Registrar Nuevos Empleados', category: 'Gestión de Personal' },
  'employees.update': { title: 'Editar Fichas de Empleados', category: 'Gestión de Personal' },
  'employees.delete': {
    title: 'Eliminar Registros de Empleados',
    category: 'Gestión de Personal'
  },
  'imports.create': {
    title: 'Importar Empleados Masivamente (Excel)',
    category: 'Gestión de Personal'
  },

  // Módulo Estructura Organizacional
  'companies.read': { title: 'Ver Lista de Empresas', category: 'Estructura Organizacional' },
  'companies.create': { title: 'Crear Empresas', category: 'Estructura Organizacional' },
  'companies.update': {
    title: 'Editar Datos de Empresa',
    category: 'Estructura Organizacional'
  },
  'companies.delete': { title: 'Eliminar Empresas', category: 'Estructura Organizacional' },
  'sites.read': { title: 'Ver Sedes y Geocercas GPS', category: 'Estructura Organizacional' },
  'sites.create': { title: 'Crear Nuevas Sedes', category: 'Estructura Organizacional' },
  'sites.update': {
    title: 'Editar Sedes y Ubicación GPS',
    category: 'Estructura Organizacional'
  },
  'sites.delete': { title: 'Eliminar Sedes', category: 'Estructura Organizacional' },
  'departments.read': {
    title: 'Ver Áreas y Departamentos',
    category: 'Estructura Organizacional'
  },
  'departments.create': {
    title: 'Crear Áreas y Departamentos',
    category: 'Estructura Organizacional'
  },
  'departments.update': {
    title: 'Editar Áreas y Departamentos',
    category: 'Estructura Organizacional'
  },
  'departments.delete': {
    title: 'Eliminar Áreas y Departamentos',
    category: 'Estructura Organizacional'
  },
  'positions.read': { title: 'Ver Cargos y Puestos', category: 'Estructura Organizacional' },
  'positions.create': { title: 'Crear Cargos y Puestos', category: 'Estructura Organizacional' },
  'positions.update': {
    title: 'Editar Cargos y Puestos',
    category: 'Estructura Organizacional'
  },
  'positions.delete': {
    title: 'Eliminar Cargos y Puestos',
    category: 'Estructura Organizacional'
  },
  'schedules.read': { title: 'Ver Horarios de Trabajo', category: 'Estructura Organizacional' },
  'schedules.create': {
    title: 'Crear Horarios de Trabajo',
    category: 'Estructura Organizacional'
  },
  'schedules.update': {
    title: 'Editar Horarios de Trabajo',
    category: 'Estructura Organizacional'
  },
  'schedules.delete': {
    title: 'Eliminar Horarios de Trabajo',
    category: 'Estructura Organizacional'
  },
  'holidays.read': { title: 'Ver Feriados y Calendario', category: 'Estructura Organizacional' },
  'holidays.create': { title: 'Registrar Feriados', category: 'Estructura Organizacional' },
  'holidays.update': { title: 'Editar Feriados', category: 'Estructura Organizacional' },
  'holidays.delete': { title: 'Eliminar Feriados', category: 'Estructura Organizacional' },

  // Módulo Anuncios y Comunicados
  'announcements.read': { title: 'Ver Anuncios Corporativos', category: 'Comunicación Interna' },
  'announcements.create': {
    title: 'Crear Nuevos Comunicados',
    category: 'Comunicación Interna'
  },
  'announcements.update': {
    title: 'Publicar o Archivar Comunicados',
    category: 'Comunicación Interna'
  },
  'announcements.delete': { title: 'Eliminar Comunicados', category: 'Comunicación Interna' },

  // Módulo Seguridad, Usuarios y Sistema
  'users.read': { title: 'Ver Cuentas de Usuario', category: 'Seguridad y Accesos' },
  'users.create': { title: 'Crear Cuentas de Usuario', category: 'Seguridad y Accesos' },
  'users.update': {
    title: 'Editar Usuarios y Cambiar Contraseñas',
    category: 'Seguridad y Accesos'
  },
  'users.delete': { title: 'Eliminar Cuentas de Usuario', category: 'Seguridad y Accesos' },
  'roles.read': { title: 'Ver Roles y Permisos', category: 'Seguridad y Accesos' },
  'roles.create': { title: 'Crear Nuevos Roles', category: 'Seguridad y Accesos' },
  'roles.update': { title: 'Asignar Permisos a Roles', category: 'Seguridad y Accesos' },
  'roles.delete': { title: 'Eliminar Roles', category: 'Seguridad y Accesos' },
  'permissions.read': { title: 'Ver Registro de Permisos', category: 'Seguridad y Accesos' },
  'permissions.create': { title: 'Crear Permisos del Sistema', category: 'Seguridad y Accesos' },
  'permissions.update': {
    title: 'Editar Permisos del Sistema',
    category: 'Seguridad y Accesos'
  },
  'permissions.delete': {
    title: 'Eliminar Permisos del Sistema',
    category: 'Seguridad y Accesos'
  },
  'sessions.read': { title: 'Ver y Revocar Sesiones Activas', category: 'Seguridad y Accesos' },
  'devices.read': { title: 'Ver Dispositivos Autorizados', category: 'Seguridad y Accesos' },
  'devices.create': { title: 'Vincular Dispositivos', category: 'Seguridad y Accesos' },
  'devices.update': {
    title: 'Autorizar o Bloquear Dispositivos',
    category: 'Seguridad y Accesos'
  },
  'devices.delete': { title: 'Eliminar Dispositivos', category: 'Seguridad y Accesos' },
  'settings.read': {
    title: 'Ver Configuración del Sistema',
    category: 'Configuración y Auditoría'
  },
  'settings.update': {
    title: 'Modificar Configuración de Empresa',
    category: 'Configuración y Auditoría'
  },
  'backups.create': {
    title: 'Generar Respaldos de Base de Datos',
    category: 'Configuración y Auditoría'
  },
  'audit-logs.read': {
    title: 'Ver Registros de Auditoría y Seguridad',
    category: 'Configuración y Auditoría'
  }
};

export function formatPermission(permission) {
  const meta = PERMISSION_LABELS[permission.code];
  if (meta) {
    return {
      title: meta.title,
      category: meta.category,
      code: permission.code
    };
  }
  const parts = permission.code.split('.');
  const actionMap = { read: 'Ver', create: 'Crear', update: 'Editar', delete: 'Eliminar' };
  const actionName = actionMap[parts[1]] || parts[1] || '';
  const resourceName = parts[0] || 'recurso';
  return {
    title: `${actionName} ${resourceName}`.trim(),
    category: 'Otros Permisos',
    code: permission.code
  };
}

export function renderRoles() {
  const list = query('#roles-list');
  if (!list) return;
  list.innerHTML = state.roles.length
    ? state.roles
      .map(
        (role) =>
          `<button class="role-row ${role.id === state.selectedRoleId ? 'active' : ''}" data-role-id="${role.id}" type="button"><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.description || 'Sin descripción')}</small></button>`
      )
      .join('')
    : '<p class="empty-state">No hay roles configurados.</p>';
}

export async function selectRole(roleId) {
  state.selectedRoleId = roleId;
  renderRoles();
  const saveBtn = query('#save-role-permissions');
  if (saveBtn) saveBtn.disabled = true;
  try {
    const role = await api(`/roles/${roleId}/permissions`);
    const nameEl = query('#selected-role-name');
    const permList = query('#permissions-list');
    if (nameEl) nameEl.textContent = role.name;
    const assigned = new Set((role.rolePermissions || []).map((entry) => entry.permission.id));

    if (!state.permissions.length) {
      if (permList) permList.innerHTML = '<p class="empty-state">No hay permisos configurados.</p>';
      return;
    }

    const categoriesMap = {};
    state.permissions.forEach((permission) => {
      const formatted = formatPermission(permission);
      if (!categoriesMap[formatted.category]) {
        categoriesMap[formatted.category] = [];
      }
      categoriesMap[formatted.category].push({ ...permission, formatted });
    });

    if (permList) {
      permList.innerHTML = Object.entries(categoriesMap)
        .map(([categoryName, items]) => {
          const optionsHtml = items
            .map(
              (p) => `
                <label class="permission-option">
                  <input type="checkbox" value="${p.id}" ${assigned.has(p.id) ? 'checked' : ''} />
                  <div class="permission-option-info">
                    <span class="permission-option-title">${escapeHtml(p.formatted.title)}</span>
                    <small class="permission-code-tag">${escapeHtml(p.formatted.code)}</small>
                  </div>
                </label>
              `
            )
            .join('');

          return `
            <div class="permission-category-group">
              <h4 class="permission-category-title">${escapeHtml(categoryName)}</h4>
              <div class="permission-category-options">${optionsHtml}</div>
            </div>
          `;
        })
        .join('');
    }

    if (saveBtn) saveBtn.disabled = false;
  } catch (error) {
    showMessage(error.message);
  }
}

export async function loadRolesAndPermissions() {
  try {
    clearMessage();
    const [roles, permissions] = await Promise.all([
      api('/roles?limit=100'),
      api('/permissions?limit=100')
    ]);
    state.roles = roles.items || [];
    state.permissions = permissions.items || [];
    renderRoles();
    if (state.roles.length) await selectRole(state.selectedRoleId || state.roles[0].id);
  } catch (error) {
    showMessage(error.message);
  }
}

export function openRoleDialog() {
  const form = query('#create-role-form');
  const dialog = query('#role-dialog');
  if (form) form.reset();
  if (dialog) dialog.showModal();
}

export async function createRole() {
  const form = query('#create-role-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const button = query('#submit-role-form');
  button.disabled = true;
  try {
    const created = await api('/roles', { method: 'POST', body: JSON.stringify(values) });
    const dialog = query('#role-dialog');
    if (dialog) dialog.close();
    form.reset();
    showToast('Rol creado exitosamente');
    state.selectedRoleId = created?.id;
    await loadRolesAndPermissions();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function saveRolePermissions() {
  if (!state.selectedRoleId) return;
  const permissionIds = queryAll('#permissions-list input:checked').map((input) => input.value);
  const button = query('#save-role-permissions');
  button.disabled = true;
  try {
    await api(`/roles/${state.selectedRoleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds })
    });
    showToast('Permisos actualizados; las sesiones afectadas fueron cerradas');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}
