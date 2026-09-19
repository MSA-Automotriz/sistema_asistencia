import { state } from '../../core/state.js';
import { query, fullName, formatDate, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { signOut } from '../../core/auth.js';
import { requestStatusClass } from '../requests/requests.js';
import { updatePushStatusUI } from '../notifications/notifications.js';

export function renderMyRequests(items) {
  const container = query('#my-request-list');
  if (!container) return;
  container.innerHTML = items.length
    ? items
      .map((item) => {
        const date = item.date || item.startDate;
        return `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.type)}</strong><small class="row-meta">${formatDate(date)} · ${escapeHtml(item.reason || item.licenseType || '-')}</small></span><span class="status-pill ${requestStatusClass(item.status)}">${escapeHtml(item.status)}</span></div>`;
      })
      .join('')
    : '<p class="empty-state">No hay solicitudes registradas.</p>';
}

export async function loadProfile() {
  try {
    const profile = await api('/me/profile');
    state.profile = profile;
    const user = profile.user;
    const initials =
      `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'MS';

    if (query('#profile-avatar-badge')) query('#profile-avatar-badge').textContent = initials;
    if (query('#profile-hero-name')) query('#profile-hero-name').textContent = fullName(user);
    if (query('#profile-hero-email')) query('#profile-hero-email').textContent = user.email || '-';
    if (query('#profile-hero-role'))
      query('#profile-hero-role').textContent = user.role || 'Empleado';

    if (query('#hero-code')) query('#hero-code').textContent = profile.employeeCode || 'N/A';
    if (query('#hero-company'))
      query('#hero-company').textContent = profile.company?.name || 'MSA Automotriz';
    if (query('#hero-site')) query('#hero-site').textContent = profile.site?.name || 'Sin sede';
    if (query('#hero-schedule'))
      query('#hero-schedule').textContent = profile.schedule?.name || 'Sin horario';
    if (query('#hero-birthday')) {
      if (profile.birthDate) {
        const bDate = new Date(profile.birthDate);
        const day = bDate.getUTCDate();
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        query('#hero-birthday').textContent = `${day} de ${months[bDate.getUTCMonth()]}`;
      } else {
        query('#hero-birthday').textContent = 'No registrado';
      }
    }

    if (query('#profile-first-name')) query('#profile-first-name').value = user.firstName || '';
    if (query('#profile-last-name')) query('#profile-last-name').value = user.lastName || '';
    if (query('#profile-photo-url')) query('#profile-photo-url').value = profile.profilePhotoUrl || '';

    const [devices, requests, recoveryQuestions] = await Promise.all([
      api('/me/devices'),
      api('/me/requests'),
      api('/auth/recovery-questions').catch(() => [])
    ]);

    const devList = query('#profile-device-list');
    if (devList) {
      devList.innerHTML = devices.length
        ? devices
          .map(
            (device) =>
              `<div class="request-row"><span><strong class="row-name">${escapeHtml(device.name || device.userAgent || 'Dispositivo')}</strong><small class="row-meta">${formatDate(device.lastSeenAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><button class="small-button reject-button" data-own-device-delete="${device.id}" type="button">Quitar</button></div>`
          )
          .join('')
        : '<p class="empty-state">No hay dispositivos registrados.</p>';
    }

    if (Array.isArray(recoveryQuestions)) {
      if (recoveryQuestions[0] && query('#recovery-q1')) {
        query('#recovery-q1').value = recoveryQuestions[0].question || '';
      }
      if (recoveryQuestions[1] && query('#recovery-q2')) {
        query('#recovery-q2').value = recoveryQuestions[1].question || '';
      }
    }

    renderMyRequests(requests.items || []);
    void updatePushStatusUI();
  } catch (error) {
    state.profile = null;
    showToast(error.message, 'error');
  }
}

export async function saveProfile(event) {
  event.preventDefault();
  const form = query('#profile-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ profilePhotoUrl: values.profilePhotoUrl || null })
    });
    showToast('Foto de perfil actualizada correctamente');
    loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function changeOwnPassword(event) {
  event.preventDefault();
  const form = query('#profile-password-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify(values) });
    showToast('Contraseña actualizada. Inicie sesión nuevamente.');
    await signOut(false);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function saveOwnRecoveryQuestions(event) {
  event.preventDefault();
  const q1 = query('#recovery-q1')?.value.trim();
  const a1 = query('#recovery-a1')?.value.trim();
  const q2 = query('#recovery-q2')?.value.trim();
  const a2 = query('#recovery-a2')?.value.trim();

  if (!q1 || !a1 || !q2 || !a2) {
    showToast('Debe ingresar 2 preguntas y sus respuestas secretas', 'error');
    return;
  }

  try {
    await api('/auth/recovery-questions', {
      method: 'POST',
      body: JSON.stringify({
        questions: [
          { question: q1, answer: a1 },
          { question: q2, answer: a2 }
        ]
      })
    });
    showToast('Preguntas de recuperación guardadas correctamente');
    if (query('#recovery-a1')) query('#recovery-a1').value = '';
    if (query('#recovery-a2')) query('#recovery-a2').value = '';
    loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function deleteOwnDevice(id) {
  try {
    await api(`/me/devices/${id}`, { method: 'DELETE' });
    showToast('Dispositivo eliminado');
    loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
