import { state } from '../../core/state.js';
import { query, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';

export function announcementStatusClass(status) {
  return (
    { DRAFT: 'status-pending', PUBLISHED: 'status-approved', ARCHIVED: 'status-inactive' }[
    status
    ] || 'status-inactive'
  );
}

export async function loadAnnouncements() {
  try {
    clearMessage();
    const data = await api('/announcements?limit=100');
    const items = data.items || [];
    const list = query('#announcement-list');
    if (list) {
      list.innerHTML = items.length
        ? items
          .map((item) => {
            const actions =
              item.status === 'DRAFT'
                ? `<button class="small-button approve-button" data-announcement-publish="${item.id}" type="button">Publicar</button>`
                : item.status === 'PUBLISHED'
                  ? `<button class="small-button reject-button" data-announcement-archive="${item.id}" type="button">Archivar</button>`
                  : '';
            return `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.title)}</strong><small class="row-meta">${escapeHtml(item.body)}${item.expiresAt ? ` · vence ${formatDate(item.expiresAt)}` : ''}</small></span><span class="request-actions"><span class="status-pill ${announcementStatusClass(item.status)}">${escapeHtml(item.status)}</span>${actions}</span></div>`;
          })
          .join('')
        : '<p class="empty-state">No hay anuncios creados.</p>';
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function openAnnouncementDialog() {
  try {
    const [companies, roles] = await Promise.all([
      api('/companies?limit=100'),
      api('/roles?limit=100')
    ]);
    state.companies = companies.items || [];
    const compSelect = query('#announcement-company');
    const roleSelect = query('#announcement-role');
    const dialog = query('#announcement-dialog');
    
    if (compSelect) {
      compSelect.innerHTML = state.companies
        .map((company) => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
        .join('');
    }
    if (roleSelect) {
      roleSelect.innerHTML =
        `<option value="">Todo el personal</option>${(roles.items || []).map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join('')}`;
    }
    if (dialog) dialog.showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function createAnnouncement() {
  const form = query('#announcement-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const button = query('#submit-announcement-form');
  button.disabled = true;
  try {
    await api('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        audienceRoleId: values.audienceRoleId || null,
        expiresAt: values.expiresAt || null
      })
    });
    const dialog = query('#announcement-dialog');
    if (dialog) dialog.close();
    form.reset();
    showToast('Anuncio creado correctamente');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function publishAnnouncement(id) {
  try {
    await api(`/announcements/${id}/publish`, { method: 'PATCH' });
    showToast('Anuncio publicado y notificaciones enviadas');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function archiveAnnouncement(id) {
  try {
    await api(`/announcements/${id}/archive`, { method: 'PATCH' });
    showToast('Anuncio archivado');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
