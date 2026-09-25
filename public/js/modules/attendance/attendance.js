import { state } from '../../core/state.js';
import { query, escapeHtml, formatDate, formatTime, formatDateTime, fullName, hasPermission } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage } from '../../components/toast.js';
import { deviceFingerprint, queueOfflineAttendance, prepareOfflinePermit } from './offline-sync.js';
import { captureLocation } from './geofence.js';
import { loadDashboard } from '../dashboard/dashboard.js';

export function attendanceTypeLabel(type) {
  return (
    {
      CHECK_IN: 'Entrada',
      BREAK_OUT: 'Salida Refrigerio',
      BREAK_IN: 'Retorno Refrigerio',
      CHECK_OUT: 'Salida'
    }[type] || type
  );
}

export function attendanceStatusLabel(status) {
  return (
    {
      ON_TIME: 'Puntual',
      LATE: 'Tardanza',
      EARLY_DEPARTURE: 'Salida anticipada',
      OUTSIDE_GEOFENCE: 'Fuera de geocerca'
    }[status] || status
  );
}

export function handleAttendanceTypeChange(type) {
  const submitBtn = query('#submit-attendance');
  if (!submitBtn) return;
  const labels = {
    CHECK_IN: 'Registrar Entrada',
    BREAK_OUT: 'Registrar Salida a Refrigerio',
    BREAK_IN: 'Registrar Retorno de Refrigerio',
    CHECK_OUT: 'Registrar Salida de Jornada'
  };
  submitBtn.textContent = labels[type] || 'Registrar Asistencia';
}

export async function updateAttendanceTypeSelection() {
  try {
    const last = await api('/me/last-attendance');
    const formStatusEl = query('#attendance-check-status-text');
    const dashStatusEl = query('#quick-check-status-text');

    const radios = {
      CHECK_IN: query('#attendance-form input[value="CHECK_IN"]'),
      BREAK_OUT: query('#attendance-form input[value="BREAK_OUT"]'),
      BREAK_IN: query('#attendance-form input[value="BREAK_IN"]'),
      CHECK_OUT: query('#attendance-form input[value="CHECK_OUT"]')
    };

    // Asegurar que TODOS los botones de radio estén siempre habilitados para el usuario
    Object.values(radios).forEach((radio) => {
      if (radio) radio.disabled = false;
    });

    let suggestedType = 'CHECK_IN';
    let text = '';

    const isSameDay = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const now = new Date();
      return (
        d.toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) ===
        now.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
      );
    };

    if (last && isSameDay(last.recordedAt)) {
      const timeStr = formatTime(last.recordedAt, true);
      if (last.type === 'CHECK_IN') {
        suggestedType = 'BREAK_OUT';
        text = `Último registro hoy: ENTRADA a las ${timeStr}. Seleccione el movimiento a marcar:`;
      } else if (last.type === 'BREAK_OUT') {
        suggestedType = 'BREAK_IN';
        text = `Último registro hoy: SALIDA A REFRIGERIO a las ${timeStr}. Seleccione el movimiento a marcar:`;
      } else if (last.type === 'BREAK_IN') {
        suggestedType = 'CHECK_OUT';
        const excessInfo = last.excessMinutes ? ` (Tardanza: +${last.excessMinutes} min)` : '';
        text = `Último registro hoy: RETORNO DE REFRIGERIO a las ${timeStr}${excessInfo}. Seleccione el movimiento a marcar:`;
      } else if (last.type === 'CHECK_OUT') {
        suggestedType = 'CHECK_IN';
        text = `Último registro hoy: SALIDA a las ${timeStr}. Seleccione el movimiento a marcar:`;
      }
    } else if (last) {
      suggestedType = 'CHECK_IN';
      const dateStr = formatDate(last.recordedAt);
      const timeStr = formatTime(last.recordedAt, true);
      text = `Último registro: ${attendanceTypeLabel(last.type)} (${dateStr} a las ${timeStr}). Seleccione el movimiento a marcar:`;
    } else {
      suggestedType = 'CHECK_IN';
      text = 'Seleccione el tipo de marcación que desea registrar:';
    }

    // Pre-seleccionar la opción sugerida si no hay ninguna seleccionada
    const currentChecked = query('#attendance-form input[name="type"]:checked');
    if (!currentChecked && radios[suggestedType]) {
      radios[suggestedType].checked = true;
    }

    const selectedValue = query('#attendance-form input[name="type"]:checked')?.value || suggestedType;
    handleAttendanceTypeChange(selectedValue);

    if (formStatusEl) formStatusEl.textContent = text;
    if (dashStatusEl) dashStatusEl.textContent = text;
  } catch {
    // Fallback silencioso
  }
}

export async function submitAttendance(event) {
  event.preventDefault();
  const form = query('#attendance-form');
  if (!form.reportValidity()) return;
  const button = query('#submit-attendance');
  button.disabled = true;
  try {
    const location = state.attendanceLocation || (await captureLocation());
    const values = Object.fromEntries(new FormData(form));
    const payload = {
      type: values.type,
      latitude: location.latitude,
      longitude: location.longitude,
      deviceFingerprint: deviceFingerprint()
    };
    try {
      const record = await api('/attendance/check', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.attendanceLocation = null;
      const coordsEl = query('#attendance-coordinates');
      if (coordsEl) coordsEl.textContent = 'Aún no se obtuvo la ubicación.';
      
      const exactTimeStr = formatTime(record.recordedAt, true);
      let message = `${attendanceTypeLabel(record.type)} registrada a las ${exactTimeStr}`;
      if (record.type === 'BREAK_IN' && record.status === 'LATE' && record.excessMinutes) {
        message += ` (Tardanza en refrigerio: +${record.excessMinutes} min)`;
      } else if (record.status === 'LATE') {
        message += ' (Tardanza)';
      }
      showToast(
        message,
        record.status === 'LATE' ? 'error' : undefined
      );
      void prepareOfflinePermit(false);
      void updateAttendanceTypeSelection();
      if (state.session?.user?.permissions?.includes('dashboard.read')) void loadDashboard();
    } catch (error) {
      if (!/failed to fetch|network|internet/i.test(error.message)) throw error;
      queueOfflineAttendance(payload);
      showToast('Sin conexión: la asistencia quedó en cola para sincronizarse');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function registerKnownDevice() {
  try {
    await api('/me/devices', {
      method: 'POST',
      body: JSON.stringify({
        fingerprint: deviceFingerprint(),
        name: navigator.userAgent.slice(0, 180)
      })
    });
  } catch {
    return;
  }
}

export async function loadHistory() {
  try {
    const filterForm = query('#history-filter-form');
    const values = filterForm ? Object.fromEntries(new FormData(filterForm)) : {};
    const parameters = new URLSearchParams({ page: '1', limit: '100' });
    ['startDate', 'endDate', 'status', 'search'].forEach((key) => {
      if (values[key]) parameters.set(key, values[key]);
    });
    const user = state.session?.user;
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name || '';
    const canReadAll =
      roleName !== 'Empleado' &&
      (hasPermission('attendances.update') ||
        hasPermission('attendances.delete') ||
        hasPermission('attendances.read'));
    if (!canReadAll) parameters.delete('search');
    const data = await api(
      `${canReadAll ? '/attendance/history' : '/me/attendance'}?${parameters}`
    );
    const items = data.items || [];
    const tableEl = query('#history-table');
    if (tableEl) {
      tableEl.innerHTML = items.length
        ? items
          .map((item) => {
            const employee = item.employee?.user;
            const typeText = attendanceTypeLabel(item.type);
            return `<tr><td>${formatDateTime(item.recordedAt, true)}</td><td>${escapeHtml(employee ? fullName(employee) : state.profile?.user ? fullName(state.profile.user) : '-')}</td><td>${escapeHtml(item.site?.name || '-')}</td><td>${escapeHtml(typeText)}</td><td><span class="status-pill ${item.status === 'ON_TIME' ? 'status-approved' : 'status-pending'}">${escapeHtml(attendanceStatusLabel(item.status))}</span></td><td>${escapeHtml(item.approximateAddress || `${Number(item.distanceMeters || 0).toFixed(1)} m`)}</td><td>${escapeHtml(item.device || item.browser || '-')}</td></tr>`;
          })
          .join('')
        : '<tr><td colspan="7">No hay asistencias para el período indicado.</td></tr>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}
