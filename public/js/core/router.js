import { state } from './state.js';
import { query, queryAll } from './utils.js';
import { clearMessage } from '../components/toast.js';
import { ensureViewLoaded } from './view-loader.js';

// Módulos funcionales
import { loadDashboard, loadStatistics, loadCalendar } from '../modules/dashboard/dashboard.js';
import { loadHistory, updateAttendanceTypeSelection } from '../modules/attendance/attendance.js';
import { loadAttendanceMap } from '../modules/attendance/geofence.js';
import { renderOfflinePanel, synchronizeOfflineQueue } from '../modules/attendance/offline-sync.js';
import { loadRequests } from '../modules/requests/requests.js';
import { loadOrganization } from '../modules/organization/organization.js';
import { loadReports } from '../modules/reports/reports.js';
import { loadAnnouncements } from '../modules/announcements/announcements.js';
import { loadDevices } from '../modules/devices/devices.js';
import { loadSettings, loadAudit } from '../modules/audit/audit.js';
import { loadProfile } from '../modules/profile/profile.js';
import { loadUsers } from '../modules/users/users.js';
import { loadRolesAndPermissions } from '../modules/users/roles.js';
import { loadSessions } from '../modules/users/sessions.js';

export function renderSidebarNavigation() {
  const userPermissions = state.session?.user?.permissions || [];
  const has = (permission) => userPermissions.includes(permission);
  const hasAny = (permissions) => permissions.some((p) => userPermissions.includes(p));

  const userRole = state.session?.user?.role;
  const isSistemas = userRole === 'Sistemas';

  const viewPermissions = {
    dashboard: true,
    attendance: true,
    history: has('attendances.read'),
    requests: true,
    organization: hasAny([
      'companies.read',
      'sites.read',
      'departments.read',
      'positions.read',
      'employees.read'
    ]),
    reports: has('reports.read'),
    statistics: has('statistics.read'),
    calendar: has('calendar.read'),
    announcements: hasAny(['announcements.read', 'announcements.create']),
    devices: has('devices.read'),
    settings: has('settings.read'),
    audit: isSistemas,
    profile: true,
    users: has('users.read'),
    roles: has('roles.read'),
    sessions: hasAny(['sessions.read', 'users.read'])
  };

  queryAll('.nav-item').forEach((item) => {
    const target = item.dataset.viewTarget;
    if (target && viewPermissions[target] !== undefined) {
      item.hidden = !viewPermissions[target];
    }
  });
}

export async function setView(viewName) {
  clearMessage();
  await ensureViewLoaded(viewName);

  queryAll('.view').forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
    view.classList.toggle('active', view.dataset.view === viewName);
  });
  queryAll('.nav-item').forEach((item) =>
    item.classList.toggle('active', item.dataset.viewTarget === viewName)
  );

  const titles = {
    dashboard: ['Operación', 'Resumen general'],
    attendance: ['Registro seguro', 'Asistencia'],
    history: ['Trazabilidad', 'Historial de asistencias'],
    requests: ['Administración', 'Solicitudes'],
    organization: ['Estructura', 'Organización'],
    reports: ['Exportación', 'Reportes'],
    statistics: ['Indicadores', 'Estadísticas'],
    calendar: ['Planificación', 'Calendario operativo'],
    announcements: ['Comunicación interna', 'Anuncios'],
    devices: ['Seguridad operativa', 'Dispositivos'],
    settings: ['Empresa y continuidad', 'Configuración'],
    audit: ['Mantenimiento', 'Auditoría y logs'],
    profile: ['Autoservicio', 'Mi perfil'],
    users: ['Accesos', 'Usuarios'],
    roles: ['Control de acceso', 'Roles y permisos'],
    sessions: ['Seguridad', 'Sesiones activas']
  };

  if (titles[viewName]) {
    const kicker = query('#page-kicker');
    const title = query('#page-title');
    if (kicker) kicker.textContent = titles[viewName][0];
    if (title) title.textContent = titles[viewName][1];
  }

  const sidebar = query('#sidebar');
  if (sidebar) sidebar.classList.remove('open');

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'attendance') {
    renderOfflinePanel();
    void updateAttendanceTypeSelection();
    void loadAttendanceMap();
    void synchronizeOfflineQueue();
  }
  if (viewName === 'history') loadHistory();
  if (viewName === 'requests') loadRequests();
  if (viewName === 'organization') loadOrganization();
  if (viewName === 'reports') loadReports();
  if (viewName === 'statistics') loadStatistics();
  if (viewName === 'calendar') loadCalendar();
  if (viewName === 'announcements') loadAnnouncements();
  if (viewName === 'devices') loadDevices();
  if (viewName === 'settings') loadSettings();
  if (viewName === 'audit') loadAudit();
  if (viewName === 'profile') loadProfile();
  if (viewName === 'users') loadUsers();
  if (viewName === 'roles') loadRolesAndPermissions();
  if (viewName === 'sessions') loadSessions();
}

if (typeof window !== 'undefined') {
  window.setView = setView;
}
