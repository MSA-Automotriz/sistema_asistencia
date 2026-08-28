import { query } from '../core/utils.js';
import { themeStorageKey } from '../core/constants.js';

export function initTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);
  const systemPrefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(themeStorageKey, theme);
  const toggleBtn = query('#theme-toggle-button');
  if (toggleBtn) {
    toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    toggleBtn.title = theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro';
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}
