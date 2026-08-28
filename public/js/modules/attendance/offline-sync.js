import { deviceFingerprintKey, offlinePermitKey, offlineQueueKey } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { query, formatDate, readStoredJson } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
export { captureLocation } from './geofence.js';

export function deviceFingerprint() {
  let fingerprint = localStorage.getItem(deviceFingerprintKey);
  if (!fingerprint) {
    fingerprint = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random()}`;
    localStorage.setItem(deviceFingerprintKey, fingerprint);
  }
  return fingerprint;
}

export function offlinePermit() {
  const permit = readStoredJson(sessionStorage, offlinePermitKey, null);
  if (permit?.expiresAt && new Date(permit.expiresAt) > new Date()) return permit;
  sessionStorage.removeItem(offlinePermitKey);
  return null;
}

export function saveOfflinePermit(permit) {
  if (permit) sessionStorage.setItem(offlinePermitKey, JSON.stringify(permit));
  else sessionStorage.removeItem(offlinePermitKey);
}

export function offlineQueue() {
  return readStoredJson(localStorage, offlineQueueKey, []);
}

export function saveOfflineQueue(items) {
  localStorage.setItem(offlineQueueKey, JSON.stringify(items));
}

export function renderOfflinePanel() {
  const permit = offlinePermit();
  const items = offlineQueue();
  const countEl = query('#offline-queue-count');
  const stateEl = query('#offline-permit-state');
  const listEl = query('#offline-queue-list');
  
  if (countEl) countEl.textContent = items.length;
  if (stateEl) {
    stateEl.textContent = permit
      ? `Permiso disponible hasta ${formatDate(permit.expiresAt, { dateStyle: 'short', timeStyle: 'short' })}.`
      : 'Prepare un permiso mientras tenga conexión para registrar una asistencia pendiente.';
  }
  if (listEl) {
    listEl.innerHTML = items.length
      ? items
        .map(
          (item) =>
            `<div class="request-row"><span><strong class="row-name">${item.type === 'CHECK_IN' ? 'Entrada' : 'Salida'} pendiente</strong><small class="row-meta">${formatDate(item.recordedAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><span class="status-pill status-pending">En cola</span></div>`
        )
        .join('')
      : '<p class="empty-state">No hay asistencias pendientes de sincronizar.</p>';
  }
}

export async function prepareOfflinePermit(showFeedback = true) {
  if (!navigator.onLine) {
    if (showFeedback) showToast('Necesitas conexión para preparar un permiso offline', 'error');
    return;
  }
  try {
    const permit = await api('/attendance/offline-permit', { method: 'POST' });
    saveOfflinePermit(permit);
    renderOfflinePanel();
    if (showFeedback) showToast('Modo offline preparado para una asistencia');
  } catch (error) {
    if (showFeedback) showToast(error.message, 'error');
  }
}

export async function synchronizeOfflineQueue() {
  if (!navigator.onLine || !state.session?.accessToken) return;
  const pending = offlineQueue();
  if (!pending.length) return;
  const remaining = [];
  for (const entry of pending) {
    try {
      await api('/attendance/offline-sync', { method: 'POST', body: JSON.stringify(entry) });
    } catch (error) {
      remaining.push({ ...entry, lastError: error.message });
    }
  }
  saveOfflineQueue(remaining);
  renderOfflinePanel();
  if (pending.length !== remaining.length) showToast('Asistencias offline sincronizadas');
}

export function queueOfflineAttendance(payload) {
  const permit = offlinePermit();
  if (!permit)
    throw new Error(
      'No hay permiso offline disponible. Conéctate y prepara uno antes de perder conexión.'
    );
  const items = offlineQueue();
  items.push({ ...payload, offlineToken: permit.token, recordedAt: new Date().toISOString() });
  saveOfflineQueue(items);
  saveOfflinePermit(null);
  renderOfflinePanel();
}
