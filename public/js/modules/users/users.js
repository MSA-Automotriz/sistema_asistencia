import { apiRoot } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { query, fullName, escapeHtml } from '../../core/utils.js';
import { api, refreshSession } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';
import { loadRolesAndPermissions } from './roles.js';

export async function loadSites() {
  if (state.sites && state.sites.length) return state.sites;
  try {
    const data = await api('/sites?limit=100');
    state.sites = data.items || [];
    return state.sites;
  } catch (error) {
    console.error('Error loading sites:', error);
    return [];
  }
}

export function renderUsers(items) {
  const table = query('#users-table');
  if (!table) return;
  table.innerHTML = items.length
    ? items
      .map((user) => {
        const statusClass =
          user.status === 'ACTIVE'
            ? 'status-active'
            : user.status === 'PENDING'
              ? 'status-pending'
              : 'status-inactive';
        const recovery = user._count?.recoveryQuestions || 0;
        const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const userCode =
          user.employee?.employeeCode ||
          (user.email && user.email.endsWith('@msa.local') ? user.email.split('@')[0] : '');
        const isStandardEmail = user.email && !user.email.endsWith('@msa.local');
        const displayMeta = userCode
          ? `ID: ${userCode}${isStandardEmail ? ` (${user.email})` : ''}`
          : user.email || '-';
        const userFullName = fullName(user);
        const siteName = user.employee?.site?.name || '-';
        return `<tr><td><strong class="row-name">${escapeHtml(userFullName)}</strong><small class="row-meta">${escapeHtml(displayMeta)}</small></td><td>${escapeHtml(user.role?.name || '-')}</td><td>${siteName !== '-' ? `<span class="badge-item" style="font-size: 0.82rem; padding: 2px 8px; border-radius: 4px; background: var(--surface-2, rgba(0,0,0,0.05)); font-weight: 500;">📍 ${escapeHtml(siteName)}</span>` : '<span style="color: var(--muted, #888);">-</span>'}</td><td><span class="status-pill ${statusClass}">${escapeHtml(user.status)}</span></td><td>${recovery}/2 preguntas</td><td><span class="table-actions"><button class="small-button quiet-button" data-edit-user-id="${user.id}" type="button">Editar</button><button class="small-button" data-user-id="${user.id}" data-user-status="${nextStatus}" type="button">${nextStatus === 'ACTIVE' ? 'Activar' : 'Desactivar'}</button><button class="small-button danger-button" data-delete-user-id="${user.id}" data-user-name="${escapeHtml(userFullName)}" type="button">Eliminar</button></span></td></tr>`;
      })
      .join('')
    : '<tr><td colspan="6">No hay usuarios registrados.</td></tr>';
}

export async function openUserDialog() {
  if (!state.roles.length) await loadRolesAndPermissions();
  await loadSites();
  const roleSelect = query('#new-user-role');
  const siteSelect = query('#new-user-site');
  const dialog = query('#user-dialog');
  
  if (roleSelect) {
    roleSelect.innerHTML = state.roles
      .map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`)
      .join('');
  }
  if (siteSelect) {
    siteSelect.innerHTML =
      '<option value="">Sin sede / Sin asignar</option>' +
      state.sites
        .filter((site) => site.active !== false)
        .map((site) => `<option value="${site.id}">${escapeHtml(site.name)}</option>`)
        .join('');
  }
  if (dialog) dialog.showModal();
}

export async function createUser() {
  const form = query('#create-user-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  if (values.email !== undefined) values.email = values.email.trim();
  if (values.idUsuario !== undefined) values.idUsuario = values.idUsuario.trim();
  if (values.siteId !== undefined) values.siteId = values.siteId.trim() || null;
  if (values.birthDate) {
    values.birthDate = values.birthDate.trim();
  } else {
    delete values.birthDate;
  }
  const button = query('#submit-user-form');
  button.disabled = true;
  try {
    await api('/users', { method: 'POST', body: JSON.stringify(values) });
    const dialog = query('#user-dialog');
    if (dialog) dialog.close();
    form.reset();
    showToast('Usuario creado correctamente');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function openEditUserDialog(userId) {
  if (!state.roles.length) await loadRolesAndPermissions();
  await loadSites();
  try {
    const user = await api(`/users/${userId}`);
    query('#edit-user-id').value = user.id;
    query('#edit-user-first-name').value = user.firstName || '';
    query('#edit-user-last-name').value = user.lastName || '';
    const userCode =
      user.employee?.employeeCode ||
      (user.email && user.email.endsWith('@msa.local') ? user.email.split('@')[0] : '');
    const isInternalEmail = user.email && user.email.endsWith('@msa.local');
    query('#edit-user-id-input').value = userCode || '';
    query('#edit-user-email').value = isInternalEmail ? '' : user.email || '';
    if (query('#edit-user-password')) query('#edit-user-password').value = '';
    const birthDateInput = query('#edit-user-birth-date');
    if (birthDateInput) {
      const bDate = user.employee?.birthDate ? new Date(user.employee.birthDate).toISOString().slice(0, 10) : '';
      birthDateInput.value = bDate;
    }
    query('#edit-user-role').innerHTML = state.roles
      .map(
        (role) =>
          `<option value="${role.id}" ${role.id === user.role?.id ? 'selected' : ''}>${escapeHtml(role.name)}</option>`
      )
      .join('');
    const currentSiteId = user.employee?.siteId || user.employee?.site?.id || '';
    query('#edit-user-site').innerHTML =
      '<option value="">Sin sede / Sin asignar</option>' +
      state.sites
        .map(
          (site) =>
            `<option value="${site.id}" ${site.id === currentSiteId ? 'selected' : ''}>${escapeHtml(site.name)}</option>`
        )
        .join('');
    query('#edit-user-dialog').showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function updateUser() {
  const form = query('#edit-user-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const userId = values.userId;
  delete values.userId;
  if (values.email !== undefined) values.email = values.email.trim();
  if (values.idUsuario !== undefined) values.idUsuario = values.idUsuario.trim();
  if (values.siteId !== undefined) values.siteId = values.siteId.trim() || null;
  if (values.birthDate) {
    values.birthDate = values.birthDate.trim();
  } else {
    delete values.birthDate;
  }
  if (!values.password?.trim()) {
    delete values.password;
  } else {
    values.password = values.password.trim();
  }
  const button = query('#submit-edit-user-form');
  button.disabled = true;
  try {
    await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(values) });
    const dialog = query('#edit-user-dialog');
    if (dialog) dialog.close();
    showToast('Usuario actualizado correctamente');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function deleteUser(button) {
  const userId = button.dataset.deleteUserId;
  const userName = button.dataset.userName || 'este usuario';
  if (
    !window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente al usuario "${userName}"? Esta acción no se puede deshacer.`
    )
  )
    return;
  button.disabled = true;
  try {
    await api(`/users/${userId}`, { method: 'DELETE' });
    showToast('Usuario eliminado correctamente');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}

export async function setUserStatus(button) {
  button.disabled = true;
  try {
    await api(`/users/${button.dataset.userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: button.dataset.userStatus })
    });
    showToast('Estado de usuario actualizado');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}

export async function loadUsers() {
  try {
    clearMessage();
    const data = await api('/users?limit=100');
    renderUsers(data.items || []);
  } catch (error) {
    showMessage(error.message);
  }
}

export async function downloadUsersPdf() {
  const button = query('#download-users-pdf');
  if (button) button.disabled = true;
  const request = async () => {
    const response = await fetch(`${apiRoot}/users/export/pdf`, {
      headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
    });
    if (response.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      return fetch(`${apiRoot}/users/export/pdf`, {
        headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
      });
    }
    return response;
  };
  try {
    const response = await request();
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || 'No fue posible exportar la lista de usuarios');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'msa-usuarios.pdf';
    link.click();
    URL.revokeObjectURL(url);
    showToast('PDF de usuarios descargado correctamente');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}
