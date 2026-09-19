import { api } from '../../core/api.js';
import { state } from '../../core/state.js';
import { query, queryAll, escapeHtml, formatDate } from '../../core/utils.js';
import { showMessage } from '../../components/toast.js';

let rawEvents = [];
let activeCategory = 'ALL';
let searchQuery = '';
let selectedDateKey = null;

function isEmployeeRole() {
  const user = state.session?.user || state.session;
  const roleName = String(user?.role?.name || user?.role || '').trim().toLowerCase();
  if (roleName === 'empleado' || roleName.includes('empleado')) return true;
  const permissions = user?.permissions || state.session?.permissions || [];
  return (
    !permissions.includes('attendances.read') &&
    !permissions.includes('reports.read') &&
    !permissions.includes('statistics.read')
  );
}

// SVG Icons reutilizables
const SVG_ICONS = {
  check: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>',
  clock: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  vacation: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  permission: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
  birthday: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path><path d="M2 21h20"></path><line x1="7" y1="8" x2="7" y2="4"></line><line x1="12" y1="8" x2="12" y2="4"></line><line x1="17" y1="8" x2="17" y2="4"></line><circle cx="7" cy="3" r="1"></circle><circle cx="12" cy="3" r="1"></circle><circle cx="17" cy="3" r="1"></circle></svg>',
  flag: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
  pin: '<svg class="cal-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
};

export function calendarPeriod() {
  const input = query('#calendar-month');
  if (input && !input.value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    input.value = `${year}-${month}`;
  }
  const [year, month] = (input?.value || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString(), year, month };
}

export async function loadCalendar() {
  const input = query('#calendar-month');
  if (input && !input.value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    input.value = `${year}-${month}`;
  }

  const period = calendarPeriod();
  const isEmployee = isEmployeeRole();

  // Ocultar filtros administrativos para rol Empleado
  const attFilter = query('[data-category="ATTENDANCE"]');
  const vacFilter = query('[data-category="VACATION"]');
  const permFilter = query('[data-category="WORK_PERMISSION"]');
  if (attFilter) attFilter.hidden = isEmployee;
  if (vacFilter) vacFilter.hidden = isEmployee;
  if (permFilter) permFilter.hidden = isEmployee;

  // Ocultar tarjetas de métricas operativas para rol Empleado
  const elAttCard = query('#cal-total-attendances')?.closest('.cal-stat-card');
  const elLateCard = query('#cal-total-late')?.closest('.cal-stat-card');
  const elVacCard = query('#cal-total-vacations')?.closest('.cal-stat-card');
  const elPermCard = query('#cal-total-permissions')?.closest('.cal-stat-card');
  if (elAttCard) elAttCard.hidden = isEmployee;
  if (elLateCard) elLateCard.hidden = isEmployee;
  if (elVacCard) elVacCard.hidden = isEmployee;
  if (elPermCard) elPermCard.hidden = isEmployee;

  try {
    const params = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate
    });
    const data = await api(`/attendance/calendar?${params}`);
    const events = data.events || [];
    rawEvents = isEmployee
      ? events.filter((ev) => ev.category === 'BIRTHDAY' || ev.category === 'HOLIDAY')
      : events;

    updateMonthlySummaryCards(rawEvents);
    renderCalendarGrid(period.year, period.month, rawEvents);

    if (selectedDateKey) {
      renderDayDetail(selectedDateKey);
    }
  } catch (error) {
    showMessage(error.message || 'Error al cargar el calendario operativo');
  }
}

function updateMonthlySummaryCards(events) {
  let attendances = 0;
  let late = 0;
  let vacations = 0;
  let permissions = 0;
  let birthdays = 0;

  events.forEach((ev) => {
    if (ev.category === 'ATTENDANCE') {
      attendances++;
      if (ev.status === 'LATE') late++;
    } else if (ev.category === 'VACATION') {
      vacations++;
    } else if (ev.category === 'WORK_PERMISSION' || ev.category === 'LICENSE') {
      permissions++;
    } else if (ev.category === 'BIRTHDAY') {
      birthdays++;
    }
  });

  const elAtt = query('#cal-total-attendances');
  const elLate = query('#cal-total-late');
  const elVac = query('#cal-total-vacations');
  const elPerm = query('#cal-total-permissions');
  const elBirth = query('#cal-total-birthdays');

  if (elAtt) elAtt.textContent = attendances;
  if (elLate) elLate.textContent = late;
  if (elVac) elVac.textContent = vacations;
  if (elPerm) elPerm.textContent = permissions;
  if (elBirth) elBirth.textContent = birthdays;
}

function getFilteredEvents() {
  const isEmployee = isEmployeeRole();
  return rawEvents.filter((ev) => {
    if (isEmployee && ev.category !== 'BIRTHDAY' && ev.category !== 'HOLIDAY') {
      return false;
    }

    if (activeCategory !== 'ALL') {
      if (activeCategory === 'WORK_PERMISSION') {
        if (ev.category !== 'WORK_PERMISSION' && ev.category !== 'LICENSE') return false;
      } else if (ev.category !== activeCategory) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = ev.title?.toLowerCase().includes(q);
      const detailMatch = ev.detail?.toLowerCase().includes(q);
      if (!titleMatch && !detailMatch) return false;
    }

    return true;
  });
}

function renderCalendarGrid(year, month, events) {
  const container = query('#calendar-grid');
  if (!container) return;

  const isEmployee = isEmployeeRole();
  const filtered = getFilteredEvents();

  const eventsByDate = new Map();
  filtered.forEach((ev) => {
    if (isEmployee && ev.category !== 'BIRTHDAY' && ev.category !== 'HOLIDAY') return;

    const startDate = new Date(ev.start);
    const endDate = ev.end ? new Date(ev.end) : startDate;

    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const last = new Date(endDate);
    last.setHours(0, 0, 0, 0);

    while (current <= last) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(ev);
      current.setDate(current.getDate() + 1);
    }
  });

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = '';

  const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    html += `<div class="cal-day-cell other-month"><div class="cal-day-header"><span class="cal-day-num">${dayNum}</span></div></div>`;
  }

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = eventsByDate.get(dateKey) || [];
    const isToday = dateKey === todayKey;
    const isSelected = dateKey === selectedDateKey;

    const holidayEvent = dayEvents.find((e) => e.category === 'HOLIDAY');
    const isHoliday = Boolean(holidayEvent);

    let attCount = 0;
    let lateCount = 0;
    let vacCount = 0;
    let permCount = 0;
    const birthEvents = [];

    dayEvents.forEach((e) => {
      if (isEmployee) {
        if (e.category === 'BIRTHDAY') birthEvents.push(e);
      } else {
        if (e.category === 'ATTENDANCE') {
          attCount++;
          if (e.status === 'LATE') lateCount++;
        } else if (e.category === 'VACATION') {
          vacCount++;
        } else if (e.category === 'WORK_PERMISSION' || e.category === 'LICENSE') {
          permCount++;
        } else if (e.category === 'BIRTHDAY') {
          birthEvents.push(e);
        }
      }
    });

    let badgesHtml = '';
    if (holidayEvent) {
      badgesHtml += `<div class="cal-event-pill cal-pill-hol" title="${escapeHtml(holidayEvent.title)}">${SVG_ICONS.flag} <span>${escapeHtml(holidayEvent.title)}</span></div>`;
    }
    if (birthEvents.length > 0) {
      const birthLabel = birthEvents.length === 1 
        ? birthEvents[0].title.replace(/^Cumpleaños\s*-\s*/i, '') 
        : `${birthEvents.length} cumpleaños`;
      badgesHtml += `<div class="cal-event-pill cal-pill-birth" title="${escapeHtml(birthEvents.map((b) => b.title).join(' • '))}">${SVG_ICONS.birthday} <span>${escapeHtml(birthLabel)}</span></div>`;
    }
    if (!isEmployee) {
      if (attCount > 0) {
        badgesHtml += `<div class="cal-event-pill cal-pill-att">${SVG_ICONS.check} <span>${attCount} asistencias</span></div>`;
      }
      if (lateCount > 0) {
        badgesHtml += `<div class="cal-event-pill cal-pill-late">${SVG_ICONS.clock} <span>${lateCount} tardanzas</span></div>`;
      }
      if (vacCount > 0) {
        badgesHtml += `<div class="cal-event-pill cal-pill-vac">${SVG_ICONS.vacation} <span>${vacCount} vacaciones</span></div>`;
      }
      if (permCount > 0) {
        badgesHtml += `<div class="cal-event-pill cal-pill-perm">${SVG_ICONS.permission} <span>${permCount} permisos</span></div>`;
      }
    }

    html += `
      <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isHoliday ? 'is-holiday' : ''}" 
           data-calendar-date="${dateKey}">
        <div class="cal-day-header">
          <span class="cal-day-num">${day}</span>
          ${isHoliday ? `<span class="cal-holiday-tag" title="${escapeHtml(holidayEvent.title)}">Feriado</span>` : ''}
        </div>
        <div class="cal-day-badges">
          ${badgesHtml}
        </div>
      </div>
    `;
  }

  const totalRenderedCells = startingDay + totalDaysInMonth;
  const remainingCells = (7 - (totalRenderedCells % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    html += `<div class="cal-day-cell other-month"><div class="cal-day-header"><span class="cal-day-num">${i}</span></div></div>`;
  }

  container.innerHTML = html;
}

export function selectCalendarDay(dateKey) {
  selectedDateKey = dateKey;

  queryAll('.cal-day-cell').forEach((cell) => {
    cell.classList.toggle('selected', cell.dataset.calendarDate === dateKey);
  });

  renderDayDetail(dateKey);

  if (window.innerWidth <= 1024) {
    const drawer = query('#calendar-day-drawer');
    if (drawer) {
      drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function renderDayDetail(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);

  const titleEl = query('#day-drawer-title');
  const kickerEl = query('#day-drawer-kicker');
  const metricsEl = query('#day-drawer-metrics');
  const listEl = query('#day-drawer-list');

  const formattedDate = dateObj.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (titleEl) titleEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  if (kickerEl) kickerEl.textContent = `Registros del ${day}/${month}/${year}`;

  const isEmployee = isEmployeeRole();
  const filtered = getFilteredEvents();
  const dayEvents = filtered.filter((ev) => {
    if (isEmployee && ev.category !== 'BIRTHDAY' && ev.category !== 'HOLIDAY') return false;
    const startDate = new Date(ev.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = ev.end ? new Date(ev.end) : new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    const target = new Date(year, month - 1, day, 12, 0, 0);
    return target >= startDate && target <= endDate;
  });

  let attendances = 0;
  let late = 0;
  let vacations = 0;
  let permissions = 0;
  let birthdays = 0;

  dayEvents.forEach((ev) => {
    if (ev.category === 'ATTENDANCE') {
      attendances++;
      if (ev.status === 'LATE') late++;
    } else if (ev.category === 'VACATION') vacations++;
    else if (ev.category === 'WORK_PERMISSION' || ev.category === 'LICENSE') permissions++;
    else if (ev.category === 'BIRTHDAY') birthdays++;
  });

  const isEmployee = isEmployeeRole();

  if (metricsEl) {
    if (isEmployee) {
      if (birthdays > 0) {
        metricsEl.innerHTML = `<div class="mini-metric"><span>Cumpleaños</span><strong class="text-pink">${birthdays}</strong></div>`;
      } else {
        metricsEl.innerHTML = '';
      }
    } else {
      let metricsHtml = `
        <div class="mini-metric"><span>Marcaciones</span><strong class="text-green">${attendances}</strong></div>
        <div class="mini-metric"><span>Tardanzas</span><strong class="text-amber">${late}</strong></div>
        <div class="mini-metric"><span>Vacaciones</span><strong class="text-blue">${vacations}</strong></div>
        <div class="mini-metric"><span>Permisos</span><strong class="text-purple">${permissions}</strong></div>
      `;
      if (birthdays > 0) {
        metricsHtml += `<div class="mini-metric"><span>Cumpleaños</span><strong class="text-pink">${birthdays}</strong></div>`;
      }
      metricsEl.innerHTML = metricsHtml;
    }
  }

  if (listEl) {
    if (!dayEvents.length) {
      listEl.innerHTML = isEmployee
        ? '<p class="empty-state">No se registraron feriados ni cumpleaños para esta fecha.</p>'
        : '<p class="empty-state">No se registraron asistencias, vacaciones, permisos ni cumpleaños para esta fecha.</p>';
      return;
    }

    listEl.innerHTML = dayEvents
      .map((ev) => {
        const timeStr = ev.category === 'ATTENDANCE'
          ? formatDate(ev.start, { timeStyle: 'short' })
          : (ev.category === 'HOLIDAY' || ev.category === 'BIRTHDAY' ? 'Todo el día' : 'Jornada completa');

        const catClass = ev.status === 'LATE' ? 'cat-LATE' : `cat-${ev.category}`;
        const badgeLabel = ev.category === 'BIRTHDAY' ? 'Cumpleaños' : (ev.status || 'Registrado');
        const badgeClass = ev.category === 'BIRTHDAY'
          ? 'badge-pink'
          : (ev.status === 'LATE' ? 'badge-amber' : 'badge-neutral');
        const icon = ev.category === 'BIRTHDAY' ? SVG_ICONS.birthday : SVG_ICONS.clock;

        return `
          <div class="day-event-item ${catClass}">
            <div class="day-event-top">
              <span class="day-event-time">${icon} ${timeStr}</span>
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </div>
            <div class="day-event-name">${escapeHtml(ev.title)}</div>
            ${ev.detail ? `<div class="day-event-detail">${SVG_ICONS.pin} ${escapeHtml(ev.detail)}</div>` : ''}
          </div>
        `;
      })
      .join('');
  }
}

export function handleCategoryFilter(category) {
  activeCategory = category;
  queryAll('#calendar-category-filters .filter-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  const period = calendarPeriod();
  renderCalendarGrid(period.year, period.month, rawEvents);
  if (selectedDateKey) renderDayDetail(selectedDateKey);
}

export function handleCalendarSearch(text) {
  searchQuery = text.trim();
  const period = calendarPeriod();
  renderCalendarGrid(period.year, period.month, rawEvents);
  if (selectedDateKey) renderDayDetail(selectedDateKey);
}

export function changeCalendarMonth(offset) {
  const input = query('#calendar-month');
  if (!input) return;
  const [year, month] = (input.value || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  input.value = `${y}-${m}`;
  selectedDateKey = null;
  loadCalendar();
}

export function resetCalendarToToday() {
  const input = query('#calendar-month');
  if (!input) return;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  input.value = `${y}-${m}`;
  const todayKey = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;
  loadCalendar().then(() => {
    selectCalendarDay(todayKey);
  });
}

export function clearCalendarDaySelection() {
  selectedDateKey = null;
  queryAll('.cal-day-cell').forEach((cell) => cell.classList.remove('selected'));
  const titleEl = query('#day-drawer-title');
  const kickerEl = query('#day-drawer-kicker');
  const metricsEl = query('#day-drawer-metrics');
  const listEl = query('#day-drawer-list');

  if (titleEl) titleEl.textContent = 'Selecciona un día';
  if (kickerEl) kickerEl.textContent = 'Detalle del día';
  if (metricsEl) metricsEl.innerHTML = '';
  if (listEl) {
    listEl.innerHTML = '<p class="empty-state">Haz clic en cualquier día del calendario para ver el desglose de asistencias, tardanzas, vacaciones y permisos.</p>';
  }
}
