import { state } from './state.js';

export const query = (selector) => document.querySelector(selector);
export const queryAll = (selector) => [...document.querySelectorAll(selector)];

export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]
  );

export const formatDate = (value, options = { dateStyle: 'medium' }) =>
  value ? new Intl.DateTimeFormat('es-PE', options).format(new Date(value)) : '-';

export const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(value)
    )
    : '-';

export const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Sin nombre';

export const hasPermission = (permission) => state.session?.user?.permissions?.includes(permission);

export function readStoredJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}
