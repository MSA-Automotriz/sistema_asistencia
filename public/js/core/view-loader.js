/**
 * Cargador dinámico de vistas y modales HTML con resolución automática de rutas base
 */

import { query } from './utils.js';

export const VIEW_TEMPLATES = {
  dashboard: 'views/dashboard/dashboard.html',
  attendance: 'views/attendance/attendance.html',
  history: 'views/history/history.html',
  requests: 'views/requests/requests.html',
  organization: 'views/organization/organization.html',
  reports: 'views/reports/reports.html',
  statistics: 'views/statistics/statistics.html',
  calendar: 'views/calendar/calendar.html',
  announcements: 'views/announcements/announcements.html',
  devices: 'views/devices/devices.html',
  settings: 'views/settings/settings.html',
  audit: 'views/audit/audit.html',
  profile: 'views/profile/profile.html',
  users: 'views/users/users.html',
  roles: 'views/roles/roles.html',
  sessions: 'views/sessions/sessions.html',
  tickets: 'views/tickets/tickets.html'
};

export const MODAL_TEMPLATES = [
  'views/modals/user-dialog.html',
  'views/modals/edit-user-dialog.html',
  'views/modals/role-dialog.html',
  'views/modals/organization-dialog.html',
  'views/modals/employee-import-dialog.html',
  'views/modals/announcement-dialog.html',
  'views/modals/request-dialog.html',
  'views/modals/ticket-dialog.html',
  'views/modals/resolve-ticket-dialog.html'
];

const templateCache = new Map();
const loadedViews = new Set();
let modalsLoaded = false;

const KNOWN_SPA_ROUTES = new Set(Object.keys(VIEW_TEMPLATES));

function getAppBasePath() {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  const cleanPath = path.endsWith('.html')
    ? path.substring(0, path.lastIndexOf('/'))
    : path.replace(/\/$/, '');

  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 0 && KNOWN_SPA_ROUTES.has(segments[segments.length - 1])) {
    segments.pop();
  }
  return segments.length ? '/' + segments.join('/') : '';
}

function resolvePath(relativePath) {
  const base = getAppBasePath();
  const cleanRelative = relativePath.replace(/^\//, '');
  return base ? `${base}/${cleanRelative}` : `/${cleanRelative}`;
}

export async function fetchTemplate(relativePath) {
  const url = resolvePath(relativePath);
  if (templateCache.has(url)) return templateCache.get(url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar la plantilla: ${url}`);
    const html = await response.text();
    templateCache.set(url, html);
    return html;
  } catch (error) {
    console.error(`Error loading template ${url}:`, error);
    throw error;
  }
}

export async function loadModals() {
  if (modalsLoaded) return;
  const container = query('#dialogs-container');
  if (!container) return;

  try {
    const htmlFragments = await Promise.all(MODAL_TEMPLATES.map((path) => fetchTemplate(path)));
    container.innerHTML = htmlFragments.join('\n');
    modalsLoaded = true;
  } catch (error) {
    console.error('Error loading modal dialogs:', error);
  }
}

export async function ensureViewLoaded(viewName) {
  const relativePath = VIEW_TEMPLATES[viewName];
  if (!relativePath) return;

  let section = query(`section.view[data-view="${viewName}"]`);
  if (!section) {
    const container = query('#views-container');
    if (!container) return;
    section = document.createElement('section');
    section.className = 'view';
    section.dataset.view = viewName;
    section.hidden = true;
    container.appendChild(section);
  }

  if (!loadedViews.has(viewName)) {
    const html = await fetchTemplate(relativePath);
    section.innerHTML = html;
    loadedViews.add(viewName);
  }
  return section;
}

export async function preloadAllViews() {
  await loadModals();
  const viewNames = Object.keys(VIEW_TEMPLATES);
  await Promise.all(viewNames.map((name) => ensureViewLoaded(name)));
}
