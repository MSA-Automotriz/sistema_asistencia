import { query, queryAll, fullName, formatTime, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { attendanceTypeLabel } from '../attendance/attendance.js';

let cachedActivityItems = [];
let activeFilter = 'ALL';
let currentSearchTerm = '';
let activityListenersBound = false;

let cachedRosterItems = [];
let rosterSearchTerm = '';
let rosterListenersBound = false;

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getInitials(name) {
  if (!name) return 'EM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getEventBadgeClass(type) {
  switch (type) {
    case 'CHECK_IN':
      return 'event-pill-check-in';
    case 'CHECK_OUT':
      return 'event-pill-check-out';
    case 'LUNCH_BREAK':
      return 'event-pill-lunch-break';
    case 'LUNCH_RETURN':
      return 'event-pill-lunch-return';
    default:
      return 'event-pill';
  }
}

function filterActivityItems() {
  const normQuery = normalize(currentSearchTerm);
  return cachedActivityItems.filter((item) => {
    // 1. Filter by category pill
    if (activeFilter === 'CHECK_IN' && item.type !== 'CHECK_IN') return false;
    if (activeFilter === 'CHECK_OUT' && item.type !== 'CHECK_OUT') return false;
    if (activeFilter === 'LUNCH' && item.type !== 'LUNCH_BREAK' && item.type !== 'LUNCH_RETURN') return false;

    // 2. Filter by search term
    if (!normQuery) return true;
    const name = normalize(fullName(item.employee?.user));
    const event = normalize(attendanceTypeLabel(item.type));
    const location = normalize(item.approximateAddress);
    const time = normalize(formatTime(item.recordedAt));

    return (
      name.includes(normQuery) ||
      event.includes(normQuery) ||
      location.includes(normQuery) ||
      time.includes(normQuery)
    );
  });
}

function updateActivityUI() {
  const container = query('#activity-list');
  const countBadge = query('#activity-count');
  if (!container) return;

  const filtered = filterActivityItems();

  if (countBadge) {
    countBadge.textContent =
      cachedActivityItems.length > 0
        ? `${filtered.length} de ${cachedActivityItems.length}`
        : '0 hoy';
  }

  if (!cachedActivityItems.length) {
    container.innerHTML = '<p class="empty-state">Aún no hay actividad registrada hoy.</p>';
    return;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="table-empty-search">
        <div class="table-empty-content">
          <p>No se encontraron marcaciones para "<strong>${escapeHtml(currentSearchTerm)}</strong>"</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const name = fullName(item.employee?.user);
      const eventLabel = attendanceTypeLabel(item.type);
      const badgeClass = getEventBadgeClass(item.type);
      const initials = getInitials(name);
      const timeStr = formatTime(item.recordedAt);
      const locationStr = item.approximateAddress || 'Sin ubicación';

      return `
        <article class="activity-card-item">
          <div class="activity-card-content">
            <span class="activity-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
            <div class="activity-card-text">
              <strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong>
              <small title="${escapeHtml(locationStr)} · ${escapeHtml(timeStr)}">
                ${escapeHtml(locationStr)} · ${escapeHtml(timeStr)}
              </small>
            </div>
          </div>
          <span class="event-pill ${badgeClass}">${escapeHtml(eventLabel)}</span>
        </article>
      `;
    })
    .join('');
}

function setupActivityListeners() {
  const searchInput = query('#activity-search');
  const clearBtn = query('#activity-search-clear');
  const filterBtns = queryAll('.activity-filter-btn');

  if (searchInput && !activityListenersBound) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value;
      if (clearBtn) {
        clearBtn.hidden = !currentSearchTerm;
      }
      updateActivityUI();
    });
  }

  if (clearBtn && !activityListenersBound) {
    clearBtn.addEventListener('click', () => {
      currentSearchTerm = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.hidden = true;
      updateActivityUI();
    });
  }

  if (filterBtns.length && !activityListenersBound) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter || 'ALL';
        updateActivityUI();
      });
    });
  }

  activityListenersBound = true;
}

export function renderActivity(items) {
  cachedActivityItems = Array.isArray(items) ? items : [];
  setupActivityListeners();
  updateActivityUI();
}

function filterRosterItems() {
  const normQuery = normalize(rosterSearchTerm);
  if (!normQuery) return cachedRosterItems;

  return cachedRosterItems.filter((item) => {
    const person = item.employee?.user || item.user;
    const name = normalize(fullName(person));
    const meta = normalize(item.employeeCode || item.employee?.employeeCode || item.status || '');
    return name.includes(normQuery) || meta.includes(normQuery);
  });
}

function updateRosterUI() {
  const listEl = query('#roster-list');
  const countBadge = query('#roster-count');
  if (!listEl) return;

  const filtered = filterRosterItems();

  if (countBadge) {
    countBadge.textContent = `${filtered.length}`;
  }

  if (!cachedRosterItems.length) {
    listEl.innerHTML = '<p class="empty-state">No hay registros para mostrar.</p>';
    return;
  }

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="table-empty-search">
        <div class="table-empty-content">
          <p>No se encontraron resultados para "<strong>${escapeHtml(rosterSearchTerm)}</strong>"</p>
        </div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .map((item) => {
      const person = item.employee?.user || item.user;
      const name = fullName(person);
      const meta = item.employeeCode || item.employee?.employeeCode || item.status || '-';
      const initials = getInitials(name);
      const isLate = item.status === 'LATE';
      const statusClass = isLate ? 'status-pending' : 'status-active';
      const statusText = isLate ? 'Tardanza' : item.status || 'Presente';

      return `
        <div class="roster-row">
          <div class="activity-card-content">
            <span class="activity-avatar">${escapeHtml(initials)}</span>
            <div class="activity-card-text">
              <strong>${escapeHtml(name)}</strong>
              <small>Código: ${escapeHtml(meta)}</small>
            </div>
          </div>
          <span class="status-pill ${statusClass}">${escapeHtml(statusText)}</span>
        </div>
      `;
    })
    .join('');
}

function setupRosterListeners() {
  const searchInput = query('#roster-search');
  if (searchInput && !rosterListenersBound) {
    searchInput.addEventListener('input', (e) => {
      rosterSearchTerm = e.target.value;
      updateRosterUI();
    });
    rosterListenersBound = true;
  }
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
    cachedRosterItems = Array.isArray(items) ? items : [];
    rosterSearchTerm = '';
    const searchInput = query('#roster-search');
    if (searchInput) searchInput.value = '';

    const titleEl = query('#roster-title');
    const panelEl = query('#roster-panel');

    if (titleEl) titleEl.textContent = labels[kind];
    if (panelEl) panelEl.hidden = false;

    setupRosterListeners();
    updateRosterUI();
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
      <div class="activity-card-item">
        <div class="activity-card-content">
          <span class="activity-avatar">${item.kind === 'Permiso' ? 'PE' : 'HE'}</span>
          <div class="activity-card-text">
            <strong>${escapeHtml(item.kind)}: ${escapeHtml(item.reason || item.comments || 'Solicitud')}</strong>
            <small>${formatDate(item.createdAt)}</small>
          </div>
        </div>
        <span class="status-pill status-${(item.status || '').toLowerCase()}">${escapeHtml(item.status || 'PENDING')}</span>
      </div>
    `
      )
      .join('');
  } catch {
    container.innerHTML = `<p class="empty-state">Sin solicitudes disponibles.</p>`;
  }
}
