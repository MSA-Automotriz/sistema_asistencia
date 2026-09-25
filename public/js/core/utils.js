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
  value ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', ...options }).format(new Date(value)) : '-';

export const formatTime = (value, includeSeconds = false) => {
  if (!value) return '-';
  const opts = {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  if (includeSeconds) {
    opts.second = '2-digit';
  }
  return new Intl.DateTimeFormat('es-PE', opts).format(new Date(value));
};

export const formatDateTime = (value, includeSeconds = true) => {
  if (!value) return '-';
  const opts = {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  if (includeSeconds) {
    opts.second = '2-digit';
  }
  return new Intl.DateTimeFormat('es-PE', opts).format(new Date(value));
};

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
