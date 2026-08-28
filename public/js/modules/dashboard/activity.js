import { query, fullName, formatTime, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { attendanceTypeLabel } from '../attendance/attendance.js';

export function renderActivity(items) {
  const container = query('#activity-list');
  if (!container) return;
  container.innerHTML = items.length
    ? items
      .map((item) => {
        const name = fullName(item.employee?.user);
        const event = attendanceTypeLabel(item.type);
        return `<div class="activity-row"><span><strong class="row-name">${escapeHtml(name)}</strong><small class="row-meta">${escapeHtml(item.approximateAddress || 'Sin ubicación')} · ${formatTime(item.recordedAt)}</small></span><span class="event-pill">${event}</span></div>`;
      })
      .join('')
    : '<p class="empty-state">Aún no hay actividad registrada hoy.</p>';
}

export async function loadRoster(kind) {
  const endpoint = {
    present: '/dashboard/present',
    absent: '/dashboard/absent',
    late: '/dashboard/late'
  }[kind];
  const labels = { present: 'Personal presente', absent: 'Personal ausente', late: 'Tardanzas' };
  try {
    const items = await api(endpoint);
    const titleEl = query('#roster-title');
    const panelEl = query('#roster-panel');
    const listEl = query('#roster-list');
    
    if (titleEl) titleEl.textContent = labels[kind];
    if (panelEl) panelEl.hidden = false;
    if (listEl) {
      listEl.innerHTML = items.length
        ? items
          .map((item) => {
            const person = item.employee?.user || item.user;
            const meta = item.employeeCode || item.employee?.employeeCode || item.status || '-';
            return `<div class="roster-row"><span><strong class="row-name">${escapeHtml(fullName(person))}</strong><small class="row-meta">${escapeHtml(meta)}</small></span><span class="status-pill ${item.status === 'LATE' ? 'status-pending' : 'status-active'}">${escapeHtml(item.status || 'Activo')}</span></div>`;
          })
          .join('')
        : '<p class="empty-state">No hay registros para mostrar.</p>';
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function loadQuickEmployeeRequests() {
  const container = query('#employee-quick-requests-list');
  if (!container) return;
  try {
    const [permits, overtime] = await Promise.all([
      api('/requests/work-permissions?limit=5').catch(() => ({ items: [] })),
      api('/requests/overtime?limit=5').catch(() => ({ items: [] }))
    ]);
    const items = [
      ...(permits.items || []).map((p) => ({ ...p, kind: 'Permiso' })),
      ...(overtime.items || []).map((o) => ({ ...o, kind: 'Horas Extra' }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    if (!items.length) {
      container.innerHTML = '<p class="empty-state">No tienes solicitudes registradas.</p>';
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
      <div class="activity-row">
        <span>
          <strong class="row-name">${escapeHtml(item.kind)}: ${escapeHtml(item.reason || item.comments || 'Solicitud')}</strong>
          <small class="row-meta">${formatDate(item.createdAt)}</small>
        </span>
        <span class="status-pill status-${(item.status || '').toLowerCase()}">${escapeHtml(item.status || 'PENDING')}</span>
      </div>
    `
      )
      .join('');
  } catch {
    container.innerHTML = `<p class="empty-state">Sin solicitudes disponibles.</p>`;
  }
}
