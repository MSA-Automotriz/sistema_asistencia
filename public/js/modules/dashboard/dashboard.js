import { state } from '../../core/state.js';
import { query, fullName, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showMessage, clearMessage } from '../../components/toast.js';
import { renderDashboard } from './metrics.js';
import { renderStatisticsChart } from './charts.js';
import { loadQuickEmployeeRequests } from './activity.js';
import { updateAttendanceTypeSelection } from '../attendance/attendance.js';

export async function loadAnnouncementsForDashboard(targetSelector) {
  const container = query(targetSelector);
  if (!container) return;
  try {
    const announcements = await api('/me/announcements');
    if (!announcements || !announcements.length) {
      container.innerHTML =
        '<p class="empty-state">No hay anuncios activos publicados en este momento.</p>';
      return;
    }
    container.innerHTML = announcements
      .map((ann) => {
        const dateStr = ann.publishedAt ? formatDate(ann.publishedAt) : formatDate(ann.createdAt);
        return `
          <article class="announcement-card-hero">
            <div class="announcement-card-header">
              <span class="announcement-badge">Comunicado Oficial</span>
              <span class="announcement-card-date">${escapeHtml(dateStr)}</span>
            </div>
            <h4 class="announcement-card-title">${escapeHtml(ann.title)}</h4>
            <p class="announcement-card-body">${escapeHtml(ann.body)}</p>
          </article>
        `;
      })
      .join('');
  } catch (error) {
    container.innerHTML = `<p class="empty-state">No se pudieron cargar los anuncios: ${escapeHtml(error.message)}</p>`;
  }
}

export async function loadDashboard() {
  try {
    clearMessage();
    const user = state.session?.user;
    const userName = fullName(user) || 'Usuario';
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name || 'Empleado';
    const hasAdminDashboardAccess =
      user?.permissions?.includes('dashboard.read') || roleName === 'Administrador';

    const dateEl = query('#dashboard-date');
    const welcomeEl = query('#dashboard-welcome');
    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(new Date());
    }

    if (welcomeEl) {
      welcomeEl.textContent = `Bienvenido, ${escapeHtml(userName)} (${escapeHtml(roleName)})`;
    }

    const adminPanel = query('#admin-dashboard-view');
    const employeePanel = query('#employee-dashboard-view');

    if (hasAdminDashboardAccess) {
      if (adminPanel) adminPanel.hidden = false;
      if (employeePanel) employeePanel.hidden = true;

      const summary = await api('/dashboard/summary');
      renderDashboard(summary);
      await loadAnnouncementsForDashboard('#admin-announcements-list');
    } else {
      if (adminPanel) adminPanel.hidden = true;
      if (employeePanel) employeePanel.hidden = false;

      await Promise.all([
        loadAnnouncementsForDashboard('#employee-announcements-list'),
        loadQuickEmployeeRequests(),
        updateAttendanceTypeSelection()
      ]);
    }
  } catch (error) {
    showMessage(error.message);
  }
}

function dateRangeParameters(formSelector) {
  const form = query(formSelector);
  const values = form ? Object.fromEntries(new FormData(form)) : {};
  const parameters = new URLSearchParams();
  if (values.startDate) parameters.set('startDate', values.startDate);
  if (values.endDate) parameters.set('endDate', values.endDate);
  return parameters;
}

export async function loadStatistics() {
  try {
    const data = await api(
      `/attendance/statistics?${dateRangeParameters('#statistics-filter-form')}`
    );
    const setContent = (id, val) => {
      const el = query(id);
      if (el) el.textContent = val;
    };
    setContent('#stat-attendance-rate', `${data.kpis.attendanceRate}%`);
    setContent('#stat-punctuality-rate', `${data.kpis.punctualityRate}%`);
    setContent('#stat-worked-hours', `${data.totals.workedHours} h`);
    setContent('#stat-absences', data.totals.absences);
    renderStatisticsChart(data.series || []);
  } catch (error) {
    showMessage(error.message);
  }
}

function calendarPeriod() {
  const input = query('#calendar-month');
  if (input && !input.value) input.value = new Date().toISOString().slice(0, 7);
  const [year, month] = (input?.value || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function calendarClass(category) {
  return (
    {
      HOLIDAY: 'holiday',
      VACATION: 'vacation',
      LICENSE: 'license'
    }[category] || 'attendance'
  );
}

export async function loadCalendar() {
  try {
    const data = await api(`/attendance/calendar?${new URLSearchParams(calendarPeriod())}`);
    const events = data.events || [];
    const container = query('#calendar-events');
    if (container) {
      container.innerHTML = events.length
        ? events
          .map(
            (event) =>
              `<article class="calendar-event ${calendarClass(event.category)}"><small>${formatDate(event.start, { dateStyle: 'medium', timeStyle: event.category === 'ATTENDANCE' ? 'short' : undefined })}</small><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.detail || event.status || '')}</small></article>`
          )
          .join('')
        : '<p class="empty-state">No hay eventos para el mes seleccionado.</p>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}
