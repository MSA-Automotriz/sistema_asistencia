import { state } from '../../core/state.js';
import { query, escapeHtml, formatDate, formatTime, fullName, hasPermission } from '../../core/utils.js';
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

export async function updateAttendanceTypeSelection() {
  try {
    const last = await api('/me/last-attendance');
    const formStatusEl = query('#attendance-check-status-text');
    const dashStatusEl = query('#quick-check-status-text');
    const submitBtn = query('#submit-attendance');

    const radios = {
      CHECK_IN: query('#attendance-form input[value="CHECK_IN"]'),
      BREAK_OUT: query('#attendance-form input[value="BREAK_OUT"]'),
      BREAK_IN: query('#attendance-form input[value="BREAK_IN"]'),
      CHECK_OUT: query('#attendance-form input[value="CHECK_OUT"]')
    };

    const setOnlyAllowed = (allowedType, btnLabel) => {
      Object.keys(radios).forEach((type) => {
        const radio = radios[type];
        if (radio) {
          if (type === allowedType) {
            radio.disabled = false;
            radio.checked = true;
          } else {
            radio.disabled = true;
            radio.checked = false;
          }
        }
      });
      if (submitBtn) submitBtn.textContent = btnLabel;
    };

    let text = '';
    if (!last || last.type === 'CHECK_OUT') {
      setOnlyAllowed('CHECK_IN', 'Registrar Entrada');
      const timeInfo = last?.recordedAt ? ` (Última salida registrada: ${formatTime(last.recordedAt)})` : '';
      text = `Paso 1 de 4: Registre su ENTRADA al iniciar su jornada laboral.${timeInfo}`;
    } else if (last.type === 'CHECK_IN') {
      setOnlyAllowed('BREAK_OUT', 'Registrar Salida a Refrigerio');
      text = `Paso 2 de 4: ENTRADA registrada a las ${formatTime(last.recordedAt)}. Siguiente paso: SALIDA A REFRIGERIO.`;
    } else if (last.type === 'BREAK_OUT') {
      setOnlyAllowed('BREAK_IN', 'Registrar Retorno de Refrigerio');
      text = `Paso 3 de 4: En refrigerio desde las ${formatTime(last.recordedAt)}. Siguiente paso: RETORNO DE REFRIGERIO.`;
    } else if (last.type === 'BREAK_IN') {
      setOnlyAllowed('CHECK_OUT', 'Registrar Salida de Jornada');
      const excessInfo = last.excessMinutes ? ` (Tardanza en refrigerio: +${last.excessMinutes} min)` : '';
      text = `Paso 4 de 4: RETORNO registrado a las ${formatTime(last.recordedAt)}${excessInfo}. Siguiente paso: SALIDA de la jornada.`;
    }

    if (formStatusEl) formStatusEl.textContent = text;
    if (dashStatusEl) dashStatusEl.textContent = text;
  } catch {
    // Fallback silencioso si no se encuentra perfil
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
      form.reset();
      state.attendanceLocation = null;
      const coordsEl = query('#attendance-coordinates');
      if (coordsEl) coordsEl.textContent = 'Aún no se obtuvo la ubicación.';
      
      let message = 'Asistencia registrada correctamente';
      if (record.type === 'BREAK_OUT') {
        message = 'Salida a refrigerio registrada correctamente';
      } else if (record.type === 'BREAK_IN') {
        if (record.status === 'LATE' && record.excessMinutes) {
          message = `Retorno registrado (Tardanza en refrigerio: +${record.excessMinutes} min)`;
        } else {
          message = 'Retorno de refrigerio registrado correctamente';
        }
      } else if (record.status === 'LATE') {
        message = 'Entrada registrada con tardanza';
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
            return `<tr><td>${formatDate(item.recordedAt, { dateStyle: 'medium', timeStyle: 'short' })}</td><td>${escapeHtml(employee ? fullName(employee) : state.profile?.user ? fullName(state.profile.user) : '-')}</td><td>${escapeHtml(item.site?.name || '-')}</td><td>${escapeHtml(typeText)}</td><td><span class="status-pill ${item.status === 'ON_TIME' ? 'status-approved' : 'status-pending'}">${escapeHtml(attendanceStatusLabel(item.status))}</span></td><td>${escapeHtml(item.approximateAddress || `${Number(item.distanceMeters || 0).toFixed(1)} m`)}</td><td>${escapeHtml(item.device || item.browser || '-')}</td></tr>`;
          })
          .join('')
        : '<tr><td colspan="7">No hay asistencias para el período indicado.</td></tr>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}
