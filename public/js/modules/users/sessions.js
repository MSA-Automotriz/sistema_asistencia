import { query, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';

export async function loadSessions() {
  try {
    clearMessage();
    const sessions = await api('/auth/sessions');
    const container = query('#sessions-list');
    if (container) {
      container.innerHTML = sessions.length
        ? sessions
          .map(
            (session) =>
              `<div class="session-row"><span><strong class="row-name">${escapeHtml(session.userAgent || 'Dispositivo no identificado')}</strong><small class="row-meta">${escapeHtml(session.ipAddress || 'IP no disponible')} · ${formatDate(session.lastActiveAt, { dateStyle: 'medium', timeStyle: 'short' })}${session.rememberMe ? ' · Recordada' : ''}</small></span>${session.current ? '<span class="status-pill status-active">Actual</span>' : `<button class="quiet-button" data-session-id="${session.id}" type="button">Cerrar</button>`}</div>`
          )
          .join('')
        : '<p class="empty-state">No hay sesiones activas.</p>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function revokeSession(button) {
  button.disabled = true;
  try {
    await api(`/auth/sessions/${button.dataset.sessionId}`, { method: 'DELETE' });
    showToast('Sesión cerrada');
    loadSessions();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}
