import { state } from '../../core/state.js';
import { query, fullName, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage } from '../../components/toast.js';

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

export function renderSystemStatus(data) {
  const metrics = data.metrics || {};
  const entries = [
    ['Base de datos', data.database],
    ['Tiempo activo', `${data.uptimeSeconds || 0} s`],
    ['Empleados activos', metrics.activeEmployees || 0],
    ['Solicitudes pendientes', metrics.pendingRequests || 0],
    ['Notificaciones sin leer', metrics.unreadNotifications || 0]
  ];
  const container = query('#system-status');
  if (container) {
    container.innerHTML = entries
      .map(
        ([label, value]) =>
          `<div class="system-status-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join('');
  }
}

export async function loadAudit() {
  try {
    const [status, audits, logs] = await Promise.all([
      api('/system/status'),
      api('/audit-logs?limit=30'),
      api('/system/logs?kind=combined&limit=30')
    ]);
    renderSystemStatus(status);
    const auditList = query('#audit-list');
    const sysLogs = query('#system-log-list');
    if (auditList) {
      auditList.innerHTML = (audits.items || []).length
        ? audits.items
          .map(
            (item) =>
              `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.action)} · ${escapeHtml(item.entity)}</strong><small class="row-meta">${escapeHtml(fullName(item.user))} · ${formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })} · ${escapeHtml(item.ipAddress || '-')}</small></span></div>`
          )
          .join('')
        : '<p class="empty-state">No hay eventos de auditoría.</p>';
    }
    if (sysLogs) {
      sysLogs.innerHTML = logs.length
        ? logs
          .map(
            (entry) => `<pre class="system-log-entry">${escapeHtml(JSON.stringify(entry))}</pre>`
          )
          .join('')
        : '<p class="empty-state">No hay eventos del sistema.</p>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function analyzeDatabase() {
  try {
    await api('/system/analyze', { method: 'POST' });
    showToast('Análisis de base de datos iniciado');
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function cleanSystemData() {
  if (!window.confirm('Se eliminarán tokens vencidos y auditorías antiguas. ¿Desea continuar?'))
    return;
  try {
    await api('/system/cleanup', { method: 'POST', body: JSON.stringify({ retentionDays: 90 }) });
    showToast('Limpieza de datos completada');
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
