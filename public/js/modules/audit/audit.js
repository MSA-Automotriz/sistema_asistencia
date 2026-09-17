import { state } from '../../core/state.js';
import { query, queryAll, fullName, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage } from '../../components/toast.js';

let currentAuditItems = [];
let currentLogItems = [];
let activeLogKind = 'combined';

export function selectedCompanyId() {
  const select = query('#settings-company');
  return select ? select.value : null;
}

export function renderBackups(items) {
  const container = query('#backup-list');
  if (!container) return;
  container.innerHTML = items.length
    ? items
      .map((item) => {
        const action =
          item.status === 'COMPLETED'
            ? `<button class="small-button reject-button" data-backup-restore="${item.id}" type="button">Restaurar</button>`
            : '';
        return `<div class="request-row"><span><strong class="row-name">${item.type === 'DATABASE' ? 'Base de datos' : 'Archivos'}</strong><small class="row-meta">${formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}${item.errorMessage ? ` · ${escapeHtml(item.errorMessage)}` : ''}</small></span><span class="request-actions"><span class="status-pill ${item.status === 'COMPLETED' ? 'status-approved' : item.status === 'FAILED' ? 'status-rejected' : 'status-pending'}">${escapeHtml(item.status)}</span>${action}</span></div>`;
      })
      .join('')
    : '<p class="empty-state">No hay respaldos registrados.</p>';
}

export function updateBackupFrequencyFields() {
  const form = query('#backup-schedule-form');
  const field = query('#backup-day-of-week-field');
  if (form && field) {
    field.hidden = form.elements.frequency.value !== 'WEEKLY';
  }
}

export async function loadCompanySettings() {
  const companyId = selectedCompanyId();
  if (!companyId) return;
  const company = state.companies.find((item) => item.id === companyId);
  if (company) {
    const form = query('#company-identity-form');
    if (form) {
      form.elements.name.value = company.name || '';
      form.elements.timeZone.value = company.timeZone || 'America/Lima';
      form.elements.email.value = company.email || '';
      form.elements.logoUrl.value = company.logoUrl || '';
    }
  }
  try {
    const [settings, schedule, backupData] = await Promise.all([
      api(`/companies/${companyId}/settings`),
      api(`/backups/schedule?companyId=${companyId}`),
      api(`/backups?companyId=${companyId}&limit=20`)
    ]);
    const values = Object.fromEntries(
      (settings || []).map((setting) => [setting.key, setting.value])
    );
    const rules = query('#company-settings-form');
    if (rules) rules.elements.gpsRadius.value = values.gpsRadiusMeters || '';
    const form = query('#backup-schedule-form');
    if (form) {
      form.elements.enabled.checked = Boolean(schedule?.enabled);
      const scheduleValue = schedule || null;
      form.elements.frequency.value = scheduleValue?.frequency || 'DAILY';
      form.elements.dayOfWeek.value = scheduleValue?.dayOfWeek ?? 1;
      form.elements.hour.value = scheduleValue?.hour ?? 2;
      form.elements.minute.value = scheduleValue?.minute ?? 0;
      updateBackupFrequencyFields();
    }
    renderBackups(backupData.items || []);
  } catch (error) {
    showMessage(error.message);
  }
}

export async function loadSettings() {
  try {
    const data = await api('/companies?limit=100');
    state.companies = data.items || [];
    const select = query('#settings-company');
    if (select) {
      const previous = select.value;
      select.innerHTML = state.companies
        .map((company) => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
        .join('');
      if (previous && state.companies.some((company) => company.id === previous)) {
        select.value = previous;
      }
    }
    await loadCompanySettings();
  } catch (error) {
    showMessage(error.message);
  }
}

export async function saveCompanyIdentity(event) {
  event.preventDefault();
  const form = query('#company-identity-form');
  if (!form || !form.reportValidity() || !selectedCompanyId()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api(`/companies/${selectedCompanyId()}/identity`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...values,
        email: values.email || null,
        logoUrl: values.logoUrl || null
      })
    });
    showToast('Identidad de empresa actualizada');
    loadSettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function saveCompanySettings(event) {
  event.preventDefault();
  const form = query('#company-settings-form');
  if (!selectedCompanyId() || !form) return;
  const values = Object.fromEntries(new FormData(form));
  const settings = [{ key: 'gpsRadiusMeters', value: values.gpsRadius || '' }].filter(
    (setting) => setting.value !== ''
  );
  if (!settings.length) return showToast('Ingrese al menos una regla', 'error');
  try {
    await api(`/companies/${selectedCompanyId()}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
    showToast('Reglas operativas actualizadas');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function startBackup(type) {
  if (!selectedCompanyId()) return;
  try {
    await api('/backups', {
      method: 'POST',
      body: JSON.stringify({ companyId: selectedCompanyId(), type })
    });
    showToast('Respaldo iniciado en segundo plano');
    loadCompanySettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function saveBackupSchedule(event) {
  event.preventDefault();
  const form = query('#backup-schedule-form');
  if (!selectedCompanyId() || !form) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/backups/schedule', {
      method: 'PUT',
      body: JSON.stringify({
        companyId: selectedCompanyId(),
        enabled: form.elements.enabled.checked,
        frequency: values.frequency,
        hour: Number(values.hour),
        minute: Number(values.minute),
        dayOfWeek: Number(values.dayOfWeek),
        type: 'DATABASE'
      })
    });
    showToast('Programación de respaldo guardada');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function restoreBackup(id) {
  if (!window.confirm('La restauración sobrescribirá datos o archivos actuales. ¿Desea continuar?'))
    return;
  try {
    await api(`/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RESTORE' })
    });
    showToast('Restauración completada');
    loadCompanySettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function formatUptime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${sec}s`;
  if (minutes > 0) return `${minutes}m ${sec}s`;
  return `${sec}s`;
}

export function renderSystemStatus(data) {
  const container = query('#system-status');
  if (!container) return;

  const metrics = data?.metrics || {};
  const isDbOk = data?.database === 'connected';
  const uptime = formatUptime(data?.uptimeSeconds);

  container.innerHTML = `
    <div class="audit-stat-card">
      <div class="stat-card-header">
        <span class="stat-label">Base de Datos</span>
        <span class="stat-status-dot ${isDbOk ? 'status-ok' : 'status-err'}"></span>
      </div>
      <div class="stat-main-value">${isDbOk ? 'MySQL En línea' : 'Desconectada'}</div>
      <div class="stat-subtext">${isDbOk ? 'Conexión activa y respondiendo' : 'Error en conexión'}</div>
    </div>

    <div class="audit-stat-card">
      <div class="stat-card-header">
        <span class="stat-label">Tiempo Activo (Uptime)</span>
        <span class="stat-icon-tag">⏱️</span>
      </div>
      <div class="stat-main-value">${escapeHtml(uptime)}</div>
      <div class="stat-subtext">Servidor Node.js / Express</div>
    </div>

    <div class="audit-stat-card">
      <div class="stat-card-header">
        <span class="stat-label">Personal Activo</span>
        <span class="stat-icon-tag">👥</span>
      </div>
      <div class="stat-main-value">${metrics.activeEmployees || 0}</div>
      <div class="stat-subtext">De ${metrics.users || 0} usuarios en el sistema</div>
    </div>

    <div class="audit-stat-card">
      <div class="stat-card-header">
        <span class="stat-label">Solicitudes Pendientes</span>
        <span class="stat-icon-tag">📋</span>
      </div>
      <div class="stat-main-value ${metrics.pendingRequests > 0 ? 'text-amber' : ''}">${metrics.pendingRequests || 0}</div>
      <div class="stat-subtext">${metrics.pendingRequests > 0 ? 'Requieren aprobación' : 'Todo al día'}</div>
    </div>

    <div class="audit-stat-card">
      <div class="stat-card-header">
        <span class="stat-label">Avisos Sin Leer</span>
        <span class="stat-icon-tag">🔔</span>
      </div>
      <div class="stat-main-value">${metrics.unreadNotifications || 0}</div>
      <div class="stat-subtext">Notificaciones de sistema</div>
    </div>
  `;
}

const ENTITY_TRANSLATIONS = {
  Device: 'Dispositivo',
  Employee: 'Empleado',
  User: 'Usuario',
  Company: 'Empresa',
  Site: 'Sede',
  Department: 'Área',
  Position: 'Cargo',
  Schedule: 'Horario',
  Role: 'Rol',
  Attendance: 'Asistencia',
  Vacation: 'Vacaciones',
  WorkPermission: 'Permiso Laboral',
  License: 'Licencia',
  OfflineAttendanceToken: 'Token Offline',
  System: 'Sistema'
};

const ACTION_MAP = {
  REGISTER: { label: 'Registro', class: 'audit-badge-create', icon: '➕' },
  CREATE: { label: 'Creación', class: 'audit-badge-create', icon: '➕' },
  PROVISION: { label: 'Alta', class: 'audit-badge-create', icon: '➕' },
  UPDATE: { label: 'Modificación', class: 'audit-badge-update', icon: '✏️' },
  SET_STATUS: { label: 'Cambio de Estado', class: 'audit-badge-update', icon: '🔄' },
  DELETE: { label: 'Eliminación', class: 'audit-badge-delete', icon: '🗑️' },
  REVOKE: { label: 'Revocación', class: 'audit-badge-delete', icon: '⛔' },
  LOGIN: { label: 'Inicio de Sesión', class: 'audit-badge-auth', icon: '🔑' },
  ANALYZE: { label: 'Diagnóstico BD', class: 'audit-badge-maint', icon: '⚙️' },
  CLEANUP: { label: 'Limpieza BD', class: 'audit-badge-maint', icon: '🧹' }
};

export function renderAuditList(items = currentAuditItems, term = '') {
  const auditList = query('#audit-list');
  if (!auditList) return;

  let filtered = items;
  if (term && term.trim()) {
    const clean = term.trim().toLowerCase();
    filtered = items.filter((item) => {
      const uName = fullName(item.user).toLowerCase();
      const uEmail = (item.user?.email || '').toLowerCase();
      const action = (item.action || '').toLowerCase();
      const entity = (ENTITY_TRANSLATIONS[item.entity] || item.entity || '').toLowerCase();
      const ip = (item.ipAddress || '').toLowerCase();
      return (
        uName.includes(clean) ||
        uEmail.includes(clean) ||
        action.includes(clean) ||
        entity.includes(clean) ||
        ip.includes(clean)
      );
    });
  }

  if (!filtered.length) {
    auditList.innerHTML = term
      ? `<div class="empty-state">No se encontraron eventos para "<strong>${escapeHtml(term)}</strong>"</div>`
      : '<div class="empty-state">No hay registros de auditoría recientes.</div>';
    return;
  }

  auditList.innerHTML = filtered
    .map((item) => {
      const actMeta = ACTION_MAP[item.action] || {
        label: item.action,
        class: 'audit-badge-default',
        icon: '📌'
      };
      const entityLabel = ENTITY_TRANSLATIONS[item.entity] || item.entity;
      const userName = fullName(item.user);
      const userInitials = userName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'US';
      const formattedDate = formatDate(item.createdAt, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const ip = item.ipAddress || '127.0.0.1';

      return `
        <div class="audit-card-row">
          <div class="audit-avatar">${escapeHtml(userInitials)}</div>
          <div class="audit-card-body">
            <div class="audit-card-top">
              <span class="audit-badge ${actMeta.class}">${actMeta.icon} ${escapeHtml(actMeta.label)}</span>
              <span class="audit-entity-tag">${escapeHtml(entityLabel)}</span>
              <span class="audit-time">${escapeHtml(formattedDate)}</span>
            </div>
            <div class="audit-narrative">
              <strong>${escapeHtml(userName)}</strong> ejecutó <em>${escapeHtml(actMeta.label.toLowerCase())}</em> sobre <strong>${escapeHtml(entityLabel)}</strong>
            </div>
            <div class="audit-meta-row">
              <span class="audit-ip-pill">🌐 IP: ${escapeHtml(ip)}</span>
              ${item.device ? `<span class="audit-device-pill">💻 ${escapeHtml(item.device.slice(0, 45))}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function handleAuditFilter(term) {
  renderAuditList(currentAuditItems, term);
}

export function renderLogs(logs = currentLogItems) {
  const sysLogs = query('#system-log-list');
  if (!sysLogs) return;

  if (!Array.isArray(logs) || !logs.length) {
    sysLogs.innerHTML = '<div class="terminal-empty">No hay eventos registrados en este momento.</div>';
    return;
  }

  sysLogs.innerHTML = logs
    .map((entry) => {
      const timestamp = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString('es-PE', { hour12: false })
        : '--:--:--';
      const level = (entry.level || 'info').toUpperCase();
      const levelClass =
        level === 'ERROR'
          ? 'log-lvl-error'
          : level === 'WARN'
            ? 'log-lvl-warn'
            : level === 'DEBUG'
              ? 'log-lvl-debug'
              : 'log-lvl-info';
      const msg = entry.message || (typeof entry === 'string' ? entry : JSON.stringify(entry));

      let extraMeta = '';
      const rest = { ...entry };
      delete rest.timestamp;
      delete rest.level;
      delete rest.message;
      if (Object.keys(rest).length > 0) {
        extraMeta = `<span class="log-extra">${escapeHtml(JSON.stringify(rest))}</span>`;
      }

      return `
        <div class="terminal-line">
          <span class="log-time">[${escapeHtml(timestamp)}]</span>
          <span class="log-level ${levelClass}">${escapeHtml(level)}</span>
          <span class="log-message">${escapeHtml(msg)}</span>
          ${extraMeta}
        </div>
      `;
    })
    .join('');
}

export async function handleLogKindChange(kind) {
  activeLogKind = kind;
  queryAll('.log-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.logKind === kind);
  });
  try {
    const logs = await api(`/system/logs?kind=${kind}&limit=40`);
    currentLogItems = logs || [];
    renderLogs(currentLogItems);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export function copySystemLogs() {
  const text = currentLogItems
    .map((e) => `[${e.timestamp || ''}] [${(e.level || 'info').toUpperCase()}] ${e.message || JSON.stringify(e)}`)
    .join('\n');
  if (!text) return showToast('No hay logs para copiar');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Logs copiados al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar al portapapeles', 'error');
  });
}

export async function loadAudit() {
  try {
    const [statusRes, auditsRes, logsRes] = await Promise.allSettled([
      api('/system/status'),
      api('/audit-logs?limit=40'),
      api(`/system/logs?kind=${activeLogKind}&limit=40`)
    ]);

    if (statusRes.status === 'fulfilled') {
      renderSystemStatus(statusRes.value);
    } else {
      const container = query('#system-status');
      if (container) container.innerHTML = '<div class="empty-state">Sin permiso para ver métricas del servidor.</div>';
    }

    if (auditsRes.status === 'fulfilled') {
      currentAuditItems = auditsRes.value?.items || [];
      const searchInput = query('#audit-filter-input');
      renderAuditList(currentAuditItems, searchInput?.value || '');
    } else {
      const auditList = query('#audit-list');
      if (auditList) auditList.innerHTML = '<div class="empty-state">Sin permiso para ver eventos de auditoría.</div>';
    }

    if (logsRes.status === 'fulfilled') {
      currentLogItems = logsRes.value || [];
      renderLogs(currentLogItems);
    } else {
      const sysLogs = query('#system-log-list');
      if (sysLogs) sysLogs.innerHTML = '<div class="terminal-empty">Sin permiso para ver logs del sistema.</div>';
    }

    if (
      statusRes.status === 'rejected' &&
      auditsRes.status === 'rejected' &&
      logsRes.status === 'rejected'
    ) {
      showMessage(statusRes.reason?.message || 'No tiene permisos para ver auditoría ni logs');
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function analyzeDatabase() {
  const btn = query('#analyze-database');
  if (btn) btn.disabled = true;
  try {
    showToast('Iniciando diagnóstico y optimización de tablas...');
    const result = await api('/system/analyze', { method: 'POST' });
    const count = result?.results?.length || 0;
    showToast(`Diagnóstico completado con éxito (${count} tablas analizadas)`);
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function cleanSystemData() {
  if (
    !window.confirm(
      '¿Deseas purgar datos vencidos?\n\nEsta tarea eliminará permanentemente:\n- Tokens de sesión expirados.\n- Tokens de recuperación y permisos offline vencidos.\n- Registros de auditoría con más de 90 días de antigüedad.'
    )
  )
    return;

  const btn = query('#clean-system-data');
  if (btn) btn.disabled = true;
  try {
    const result = await api('/system/cleanup', {
      method: 'POST',
      body: JSON.stringify({ retentionDays: 90 })
    });
    showToast(
      `Limpieza completada: ${result?.sessions || 0} sesiones, ${result?.auditLogs || 0} auditorías antiguas y ${result?.offlineTokens || 0} tokens purgados.`
    );
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
