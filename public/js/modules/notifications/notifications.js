import { query, formatDate, escapeHtml } from '../../core/utils.js';
import { rawRequest, api } from '../../core/api.js';
import { showToast } from '../../components/toast.js';

export function renderNotifications(data) {
  const items = data?.items || [];
  const unread = data?.unread || 0;
  const count = query('#notification-count');
  const list = query('#notification-list');
  
  if (count) {
    count.textContent = unread;
    count.hidden = !unread;
  }
  if (list) {
    list.innerHTML = items.length
      ? items
        .map(
          (item) =>
            `<button class="notification-entry ${item.readAt ? '' : 'unread'}" data-notification-id="${item.id}" type="button"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)} · ${formatDate(item.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</small></button>`
        )
        .join('')
      : '<p class="empty-state">No hay notificaciones recientes.</p>';
  }
}

export async function loadNotifications() {
  try {
    renderNotifications(await api('/me/notifications?limit=10'));
  } catch {
    const count = query('#notification-count');
    if (count) count.hidden = true;
  }
}

export async function markNotificationRead(notificationId) {
  try {
    await api(`/me/notifications/${notificationId}/read`, { method: 'PATCH' });
    loadNotifications();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export async function markAllNotificationsRead() {
  try {
    await api('/me/notifications/read', { method: 'PATCH' });
    loadNotifications();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function updatePushStatusUI() {
  const dropdownDot = query('#push-status-dot');
  const dropdownLabel = query('#push-status-label');
  const dropdownBtn = query('#push-toggle-btn');
  const profileStatus = query('#profile-push-status');
  const profileDetail = query('#profile-push-detail');
  const profileBtn = query('#profile-push-toggle');
  const profileTestBtn = query('#profile-push-test');

  if (!('PushManager' in window) || !('serviceWorker' in navigator) || !('Notification' in window)) {
    if (dropdownLabel) dropdownLabel.textContent = 'Push no compatible';
    if (dropdownBtn) dropdownBtn.hidden = true;
    if (profileStatus) profileStatus.textContent = 'No compatible con este navegador';
    if (profileDetail) profileDetail.textContent = 'Tu navegador no soporta la Web Push API';
    if (profileBtn) profileBtn.hidden = true;
    if (profileTestBtn) profileTestBtn.hidden = true;
    return;
  }

  const permission = Notification.permission;
  const subscription = await getPushSubscription();

  if (permission === 'denied') {
    if (dropdownDot) dropdownDot.className = 'push-status-dot blocked';
    if (dropdownLabel) dropdownLabel.textContent = 'Push: Permiso bloqueado';
    if (dropdownBtn) {
      dropdownBtn.textContent = 'Bloqueado';
      dropdownBtn.disabled = true;
    }
    if (profileStatus) profileStatus.textContent = 'Permiso bloqueado en el navegador';
    if (profileDetail) profileDetail.textContent = 'Debes habilitar notificaciones en la configuración del sitio de tu navegador';
    if (profileBtn) {
      profileBtn.textContent = 'Bloqueado';
      profileBtn.disabled = true;
    }
    if (profileTestBtn) profileTestBtn.hidden = true;
  } else if (subscription) {
    if (dropdownDot) dropdownDot.className = 'push-status-dot active';
    if (dropdownLabel) dropdownLabel.textContent = 'Push: Activo en este equipo';
    if (dropdownBtn) {
      dropdownBtn.textContent = 'Desactivar';
      dropdownBtn.disabled = false;
    }
    if (profileStatus) profileStatus.textContent = 'Estado: Activo';
    if (profileDetail) profileDetail.textContent = 'Este equipo está registrado para recibir alertas nativas';
    if (profileBtn) {
      profileBtn.textContent = 'Desactivar en este equipo';
      profileBtn.disabled = false;
    }
    if (profileTestBtn) profileTestBtn.hidden = false;
  } else {
    if (dropdownDot) dropdownDot.className = 'push-status-dot';
    if (dropdownLabel) dropdownLabel.textContent = 'Push: Inactivo';
    if (dropdownBtn) {
      dropdownBtn.textContent = 'Activar';
      dropdownBtn.disabled = false;
    }
    if (profileStatus) profileStatus.textContent = 'Estado: Inactivo';
    if (profileDetail) profileDetail.textContent = 'Pulsa el botón para autorizar y recibir avisos instantáneos';
    if (profileBtn) {
      profileBtn.textContent = 'Activar en este equipo';
      profileBtn.disabled = false;
    }
    if (profileTestBtn) profileTestBtn.hidden = true;
  }
}

export async function togglePushSubscription() {
  if (!('PushManager' in window) || !('serviceWorker' in navigator) || !('Notification' in window)) {
    showToast('Las notificaciones Push no están soportadas en este navegador', 'error');
    return;
  }

  const dropdownBtn = query('#push-toggle-btn');
  const profileBtn = query('#profile-push-toggle');
  if (dropdownBtn) dropdownBtn.disabled = true;
  if (profileBtn) profileBtn.disabled = true;

  try {
    const existing = await getPushSubscription();
    if (existing) {
      await existing.unsubscribe();
      await api('/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: existing.endpoint })
      }).catch(() => undefined);
      showToast('Notificaciones Push desactivadas en este equipo');
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Permiso de notificaciones denegado', 'error');
        await updatePushStatusUI();
        return;
      }
      const data = await rawRequest('/push/public-key');
      const publicKey = data?.publicKey;
      if (!publicKey) throw new Error('No se pudo obtener la clave VAPID del servidor');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const subJson = subscription.toJSON();
      await api('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth
          }
        })
      });
      showToast('¡Notificaciones Push activadas con éxito!');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    await updatePushStatusUI();
  }
}

export async function sendTestPushNotification() {
  const btn = query('#profile-push-test');
  if (btn) btn.disabled = true;
  try {
    await api('/push/test', { method: 'POST' });
    showToast('Notificación de prueba enviada a este equipo');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
