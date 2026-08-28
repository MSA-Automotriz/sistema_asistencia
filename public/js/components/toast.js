import { query } from '../core/utils.js';

let toastTimeout = null;

export function showToast(message, type = 'success') {
  const toast = query('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.hidden = false;
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

export function showMessage(message) {
  const element = query('#app-message');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

export function clearMessage() {
  const element = query('#app-message');
  if (element) element.hidden = true;
}
