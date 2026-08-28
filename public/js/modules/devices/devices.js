import { query, fullName, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';

export async function loadDevices() {
  try {
    clearMessage();
    const data = await api('/devices?limit=100');
    const items = data.items || [];
    const table = query('#devices-table');
    if (table) {
      table.innerHTML = items.length
        ? items
          .map((item) => {
            const actions =
              item.status === 'BLOCKED'
                ? `<button class="small-button" data-device-id="${item.id}" data-device-status="AUTHORIZED" type="button">Autorizar</button>`
                : `<button class="small-button approve-button" data-device-id="${item.id}" data-device-status="AUTHORIZED" type="button">Autorizar</button><button class="small-button reject-button" data-device-id="${item.id}" data-device-status="BLOCKED" type="button">Bloquear</button>`;
            return `<tr><td>${escapeHtml(fullName(item.user))}<small class="row-meta">${escapeHtml(item.user?.email || '-')}</small></td><td>${escapeHtml(item.name || item.userAgent || '-')}</td><td>${escapeHtml(item.ipAddress || '-')}</td><td>${formatDate(item.lastSeenAt, { dateStyle: 'medium', timeStyle: 'short' })}</td><td><span class="status-pill ${item.status === 'AUTHORIZED' ? 'status-approved' : item.status === 'BLOCKED' ? 'status-rejected' : 'status-pending'}">${escapeHtml(item.status)}</span></td><td><span class="table-actions">${actions}</span></td></tr>`;
          })
          .join('')
        : '<tr><td colspan="6">No hay dispositivos registrados.</td></tr>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function setDeviceStatus(id, status) {
  try {
    await api(`/devices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast('Estado de dispositivo actualizado');
    loadDevices();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
