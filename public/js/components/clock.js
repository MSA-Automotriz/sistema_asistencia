import { query } from '../core/utils.js';

export function updateClock() {
  const now = new Date();
  const authClock = query('#auth-clock');
  if (authClock) {
    authClock.textContent = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
  }

  const attClock = query('#attendance-live-clock');
  if (attClock) {
    attClock.textContent = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);
  }
}
