import { query } from '../core/utils.js';

export function updateClock() {
  const clock = query('#auth-clock');
  if (clock) {
    clock.textContent = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  }
}
