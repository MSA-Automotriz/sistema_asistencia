const apiRoot = '/api/v1';
const sessionKey = 'msa-asistencia-session';
const deviceFingerprintKey = 'msa-asistencia-device-fingerprint';
const offlinePermitKey = 'msa-asistencia-offline-permit';
const offlineQueueKey = 'msa-asistencia-offline-queue';
const state = {
  session: null,
  storage: null,
  roles: [],
  permissions: [],
  selectedRoleId: null,
  recovery: null,
  attendanceLocation: null,
  organizationEntity: 'companies',
  organizationEditingId: null,
  organizationItems: [],
  reportType: 'ATTENDANCE',
  companies: [],
  profile: null,
  organizationReferences: {},
  geofenceMap: null,
  geofenceSiteMarker: null,
  geofenceCircle: null,
  geofenceLocationMarker: null
};

const organizationDefinitions = {
  companies: {
    label: 'Empresas',
    endpoint: '/companies',
    columns: [
      ['Nombre', (item) => item.name],
      ['RUC / ID fiscal', (item) => item.taxId],
      ['Zona horaria', (item) => item.timeZone],
      ['Estado', (item) => (item.active ? 'Activa' : 'Inactiva')]
    ],
    fields: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'taxId', label: 'RUC / ID fiscal', required: true },
      { name: 'timeZone', label: 'Zona horaria', defaultValue: 'America/Lima' },
      { name: 'email', label: 'Correo', type: 'email' },
      { name: 'phone', label: 'Teléfono' },
      { name: 'address', label: 'Dirección', wide: true },
      { name: 'active', label: 'Activa', kind: 'checkbox', defaultValue: true }
    ]
  },
  sites: {
    label: 'Sedes',
    endpoint: '/sites',
    columns: [
      ['Nombre', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Dirección', (item) => item.address],
      ['Radio', (item) => `${item.radiusMeters} m`],
      ['Estado', (item) => (item.active ? 'Activa' : 'Inactiva')]
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre de sede', required: true },
      { name: 'address', label: 'Dirección', wide: true, required: true },
      { name: 'latitude', label: 'Latitud', type: 'number', step: 'any', required: true },
      { name: 'longitude', label: 'Longitud', type: 'number', step: 'any', required: true },
      {
        name: 'radiusMeters',
        label: 'Radio permitido (m)',
        type: 'number',
        defaultValue: 10,
        required: true
      },
      { name: 'active', label: 'Activa', kind: 'checkbox', defaultValue: true }
    ]
  },
  departments: {
    label: 'Áreas',
    endpoint: '/departments',
    columns: [
      ['Área', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Descripción', (item) => item.description || '-']
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', wide: true }
    ]
  },
  positions: {
    label: 'Cargos',
    endpoint: '/positions',
    columns: [
      ['Cargo', (item) => item.name],
      ['Empresa', (item) => item.companyId],
      ['Descripción', (item) => item.description || '-']
    ],
    fields: [
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', wide: true }
    ]
  },
  schedules: {
    label: 'Horarios',
    endpoint: '/schedules',
    columns: [
      ['Horario', (item) => item.name],
      ['Tipo', (item) => item.type],
      ['Entrada', (item) => item.startTime],
      ['Salida', (item) => item.endTime],
      ['Tolerancia', (item) => `${item.toleranceMinutes} min`],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      { name: 'name', label: 'Nombre', required: true },
      {
        name: 'type',
        label: 'Tipo',
        kind: 'select',
        options: ['NORMAL', 'NIGHT', 'ROTATING', 'PART_TIME', 'FLEXIBLE'],
        required: true
      },
      { name: 'startTime', label: 'Hora de entrada', type: 'time', required: true },
      { name: 'endTime', label: 'Hora de salida', type: 'time', required: true },
      {
        name: 'toleranceMinutes',
        label: 'Tolerancia (min)',
        type: 'number',
        defaultValue: 0,
        required: true
      },
      {
        name: 'flexibleWindowMinutes',
        label: 'Ventana flexible (min)',
        type: 'number',
        defaultValue: 0
      },
      { name: 'breakStartTime', label: 'Inicio de descanso', type: 'time' },
      { name: 'breakEndTime', label: 'Fin de descanso', type: 'time' },
      { name: 'breakMinutes', label: 'Descanso (min)', type: 'number', defaultValue: 0 },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  },
  employees: {
    label: 'Empleados',
    endpoint: '/employees',
    createEndpoint: '/employees/provision',
    updateEndpoint: '/employees/:id/assignments',
    columns: [
      ['Código', (item) => item.employeeCode],
      ['Usuario', (item) => item.userId],
      ['Empresa', (item) => item.companyId],
      ['Área', (item) => item.departmentId || '-'],
      ['Horario', (item) => item.scheduleId || '-'],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      {
        name: 'userId',
        label: 'Usuario',
        kind: 'select',
        source: 'users',
        required: true,
        createOnly: true
      },
      { name: 'companyId', label: 'Empresa', kind: 'select', source: 'companies', required: true },
      { name: 'employeeCode', label: 'Código de empleado', required: true },
      { name: 'siteId', label: 'Sede', kind: 'select', source: 'sites', optional: true },
      {
        name: 'departmentId',
        label: 'Área',
        kind: 'select',
        source: 'departments',
        optional: true
      },
      { name: 'positionId', label: 'Cargo', kind: 'select', source: 'positions', optional: true },
      { name: 'scheduleId', label: 'Horario', kind: 'select', source: 'schedules', optional: true },
      {
        name: 'supervisorId',
        label: 'Supervisor',
        kind: 'select',
        source: 'employees',
        optional: true
      },
      {
        name: 'hiredAt',
        label: 'Fecha de ingreso',
        type: 'date',
        required: true,
        defaultValue: () => new Date().toISOString().slice(0, 10)
      },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  },
  'site-schedules': {
    label: 'Horarios por sede',
    endpoint: '/site-schedules',
    columns: [
      ['Sede', (item) => item.siteId],
      ['Horario', (item) => item.scheduleId],
      ['Estado', (item) => (item.active ? 'Activo' : 'Inactivo')]
    ],
    fields: [
      { name: 'siteId', label: 'Sede', kind: 'select', source: 'sites', required: true },
      { name: 'scheduleId', label: 'Horario', kind: 'select', source: 'schedules', required: true },
      { name: 'active', label: 'Activo', kind: 'checkbox', defaultValue: true }
    ]
  }
};

const query = (selector) => document.querySelector(selector);
const queryAll = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]
  );
const formatDate = (value, options = { dateStyle: 'medium' }) =>
  value ? new Intl.DateTimeFormat('es-PE', options).format(new Date(value)) : '-';
const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(value)
      )
    : '-';
const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Sin nombre';
const hasPermission = (permission) => state.session?.user?.permissions?.includes(permission);

function getSavedSession() {
  for (const storage of [localStorage, sessionStorage]) {
    const serialized = storage.getItem(sessionKey);
    if (!serialized) continue;
    try {
      return { data: JSON.parse(serialized), storage };
    } catch {
      storage.removeItem(sessionKey);
    }
  }
  return null;
}

function saveSession(session, rememberMe) {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  state.storage = rememberMe ? localStorage : sessionStorage;
  state.storage.setItem(sessionKey, JSON.stringify({ ...session, rememberMe }));
  state.session = { ...session, rememberMe };
}

function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  state.session = null;
  state.storage = null;
}

function showToast(message, type = 'success') {
  const toast = query('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function showMessage(message) {
  const element = query('#app-message');
  element.textContent = message;
  element.hidden = false;
}

function clearMessage() {
  query('#app-message').hidden = true;
}

async function rawRequest(path, options = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'No fue posible completar la operación');
  return payload?.data;
}

async function refreshSession() {
  if (!state.session?.refreshToken) throw new Error('La sesión venció');
  const data = await rawRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: state.session.refreshToken })
  });
  saveSession(data, state.session.rememberMe);
  updateAccount();
}

async function api(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };
  if (state.session?.accessToken) headers.authorization = `Bearer ${state.session.accessToken}`;
  try {
    return await rawRequest(path, { ...options, headers });
  } catch (error) {
    if (retry && /sesión|token/i.test(error.message) && state.session?.refreshToken) {
      try {
        await refreshSession();
        return api(path, options, false);
      } catch {
        signOut(false);
      }
    }
    throw error;
  }
}

function readStoredJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

function deviceFingerprint() {
  let fingerprint = localStorage.getItem(deviceFingerprintKey);
  if (!fingerprint) {
    fingerprint = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random()}`;
    localStorage.setItem(deviceFingerprintKey, fingerprint);
  }
  return fingerprint;
}

function offlinePermit() {
  const permit = readStoredJson(sessionStorage, offlinePermitKey, null);
  if (permit?.expiresAt && new Date(permit.expiresAt) > new Date()) return permit;
  sessionStorage.removeItem(offlinePermitKey);
  return null;
}

function saveOfflinePermit(permit) {
  if (permit) sessionStorage.setItem(offlinePermitKey, JSON.stringify(permit));
  else sessionStorage.removeItem(offlinePermitKey);
}

function offlineQueue() {
  return readStoredJson(localStorage, offlineQueueKey, []);
}

function saveOfflineQueue(items) {
  localStorage.setItem(offlineQueueKey, JSON.stringify(items));
}

function renderOfflinePanel() {
  const permit = offlinePermit();
  const items = offlineQueue();
  query('#offline-queue-count').textContent = items.length;
  query('#offline-permit-state').textContent = permit
    ? `Permiso disponible hasta ${formatDate(permit.expiresAt, { dateStyle: 'short', timeStyle: 'short' })}.`
    : 'Prepare un permiso mientras tenga conexión para registrar una asistencia pendiente.';
  query('#offline-queue-list').innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<div class="request-row"><span><strong class="row-name">${item.type === 'CHECK_IN' ? 'Entrada' : 'Salida'} pendiente</strong><small class="row-meta">${formatDate(item.recordedAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><span class="status-pill status-pending">En cola</span></div>`
        )
        .join('')
    : '<p class="empty-state">No hay asistencias pendientes de sincronizar.</p>';
}

function setGeofenceMapState(label, className = 'status-pending') {
  const element = query('#geofence-map-state');
  element.textContent = label;
  element.className = `status-pill ${className}`;
}

function clearGeofenceLayers() {
  if (!state.geofenceMap) return;
  ['geofenceSiteMarker', 'geofenceCircle', 'geofenceLocationMarker'].forEach((key) => {
    if (state[key]) state.geofenceMap.removeLayer(state[key]);
    state[key] = null;
  });
}

function renderGeofenceMap(site) {
  const leaflet = window.L;
  const latitude = Number(site?.latitude);
  const longitude = Number(site?.longitude);
  const radiusMeters = Number(site?.radiusMeters);
  if (!leaflet) {
    setGeofenceMapState('Mapa no disponible', 'status-inactive');
    return;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusMeters)) {
    setGeofenceMapState('Sede sin geocerca', 'status-inactive');
    return;
  }
  if (!state.geofenceMap) {
    state.geofenceMap = leaflet.map('geofence-map', { scrollWheelZoom: false });
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      })
      .addTo(state.geofenceMap);
  }
  clearGeofenceLayers();
  const center = [latitude, longitude];
  state.geofenceSiteMarker = leaflet
    .circleMarker(center, { radius: 8, color: '#e30613', fillColor: '#e30613', fillOpacity: 1 })
    .bindPopup(`Sede autorizada: ${escapeHtml(site.name || 'Sin nombre')}`)
    .addTo(state.geofenceMap);
  state.geofenceCircle = leaflet
    .circle(center, {
      radius: Math.max(1, radiusMeters),
      color: '#e30613',
      fillColor: '#e30613',
      fillOpacity: 0.12,
      weight: 2
    })
    .addTo(state.geofenceMap);
  state.geofenceMap.fitBounds(state.geofenceCircle.getBounds(), { padding: [24, 24], maxZoom: 17 });
  if (state.attendanceLocation) renderGeofenceLocation(state.attendanceLocation);
  setGeofenceMapState('Geocerca activa', 'status-active');
  window.requestAnimationFrame(() => state.geofenceMap?.invalidateSize());
}

function renderGeofenceLocation(location) {
  const leaflet = window.L;
  if (!leaflet || !state.geofenceMap || !location) return;
  if (state.geofenceLocationMarker) state.geofenceMap.removeLayer(state.geofenceLocationMarker);
  state.geofenceLocationMarker = leaflet
    .circleMarker([location.latitude, location.longitude], {
      radius: 7,
      color: '#1d4ed8',
      fillColor: '#3b82f6',
      fillOpacity: 0.95,
      weight: 2
    })
    .bindPopup('Ubicación actual')
    .addTo(state.geofenceMap);
}

async function loadAttendanceMap() {
  try {
    const profile = state.profile || (await api('/me/profile'));
    state.profile = profile;
    if (!profile.site) {
      setGeofenceMapState('Sede no disponible', 'status-inactive');
      return;
    }
    renderGeofenceMap(profile.site);
    void prepareOfflinePermit(false);
  } catch {
    setGeofenceMapState('Sede no disponible', 'status-inactive');
  }
}

async function prepareOfflinePermit(showFeedback = true) {
  if (!navigator.onLine) {
    if (showFeedback) showToast('Necesitas conexión para preparar un permiso offline', 'error');
    return;
  }
  try {
    const permit = await api('/attendance/offline-permit', { method: 'POST' });
    saveOfflinePermit(permit);
    renderOfflinePanel();
    if (showFeedback) showToast('Modo offline preparado para una asistencia');
  } catch (error) {
    if (showFeedback) showToast(error.message, 'error');
  }
}

async function synchronizeOfflineQueue() {
  if (!navigator.onLine || !state.session?.accessToken) return;
  const pending = offlineQueue();
  if (!pending.length) return;
  const remaining = [];
  for (const entry of pending) {
    try {
      await api('/attendance/offline-sync', { method: 'POST', body: JSON.stringify(entry) });
    } catch (error) {
      remaining.push({ ...entry, lastError: error.message });
    }
  }
  saveOfflineQueue(remaining);
  renderOfflinePanel();
  if (pending.length !== remaining.length) showToast('Asistencias offline sincronizadas');
}

async function captureLocation() {
  if (!navigator.geolocation) throw new Error('El navegador no permite obtener ubicación');
  query('#attendance-location-state').textContent = 'Buscando GPS';
  query('#attendance-location-state').className = 'status-pill status-pending';
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 15_000
    });
  });
  state.attendanceLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  renderGeofenceLocation(state.attendanceLocation);
  query('#attendance-coordinates').textContent =
    `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
  query('#attendance-location-state').textContent = 'GPS listo';
  query('#attendance-location-state').className = 'status-pill status-active';
  return state.attendanceLocation;
}

function queueOfflineAttendance(payload) {
  const permit = offlinePermit();
  if (!permit)
    throw new Error(
      'No hay permiso offline disponible. Conéctate y prepara uno antes de perder conexión.'
    );
  const items = offlineQueue();
  items.push({ ...payload, offlineToken: permit.token, recordedAt: new Date().toISOString() });
  saveOfflineQueue(items);
  saveOfflinePermit(null);
  renderOfflinePanel();
}

async function submitAttendance(event) {
  event.preventDefault();
  const form = query('#attendance-form');
  if (!form.reportValidity()) return;
  const button = query('#submit-attendance');
  button.disabled = true;
  try {
    const location = state.attendanceLocation || (await captureLocation());
    const values = Object.fromEntries(new FormData(form));
    const payload = {
      qrToken: values.qrToken,
      type: values.type,
      latitude: location.latitude,
      longitude: location.longitude,
      deviceFingerprint: deviceFingerprint()
    };
    try {
      const record = await api('/attendance/check', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      state.attendanceLocation = null;
      query('#attendance-coordinates').textContent = 'Aún no se obtuvo la ubicación.';
      showToast(
        record.status === 'LATE'
          ? 'Entrada registrada con tardanza'
          : 'Asistencia registrada correctamente'
      );
      void prepareOfflinePermit(false);
      if (state.session?.user?.permissions?.includes('dashboard.read')) void loadDashboard();
    } catch (error) {
      if (!/failed to fetch|network|internet/i.test(error.message)) throw error;
      queueOfflineAttendance(payload);
      showToast('Sin conexión: la asistencia quedó en cola para sincronizarse');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function registerKnownDevice() {
  try {
    await api('/me/devices', {
      method: 'POST',
      body: JSON.stringify({
        fingerprint: deviceFingerprint(),
        name: navigator.userAgent.slice(0, 180)
      })
    });
  } catch {
    return;
  }
}

function renderNotifications(data) {
  const items = data?.items || [];
  const unread = data?.unread || 0;
  const count = query('#notification-count');
  count.textContent = unread;
  count.hidden = !unread;
  query('#notification-list').innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<button class="notification-entry ${item.readAt ? '' : 'unread'}" data-notification-id="${item.id}" type="button"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)} · ${formatDate(item.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</small></button>`
        )
        .join('')
    : '<p class="empty-state">No hay notificaciones recientes.</p>';
}

async function loadNotifications() {
  try {
    renderNotifications(await api('/me/notifications?limit=10'));
  } catch {
    query('#notification-count').hidden = true;
  }
}

async function markNotificationRead(notificationId) {
  try {
    await api(`/me/notifications/${notificationId}/read`, { method: 'PATCH' });
    loadNotifications();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    await api('/me/notifications/read', { method: 'PATCH' });
    loadNotifications();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function attendanceStatusLabel(status) {
  return (
    {
      ON_TIME: 'Puntual',
      LATE: 'Tardanza',
      EARLY_DEPARTURE: 'Salida anticipada',
      OUTSIDE_GEOFENCE: 'Fuera de geocerca'
    }[status] || status
  );
}

async function loadHistory() {
  try {
    const values = Object.fromEntries(new FormData(query('#history-filter-form')));
    const parameters = new URLSearchParams({ page: '1', limit: '100' });
    ['startDate', 'endDate', 'status', 'search'].forEach((key) => {
      if (values[key]) parameters.set(key, values[key]);
    });
    const canReadAll = state.session?.user?.permissions?.includes('attendances.read');
    if (!canReadAll) parameters.delete('search');
    const data = await api(
      `${canReadAll ? '/attendance/history' : '/me/attendance'}?${parameters}`
    );
    const items = data.items || [];
    query('#history-table').innerHTML = items.length
      ? items
          .map((item) => {
            const employee = item.employee?.user;
            return `<tr><td>${formatDate(item.recordedAt, { dateStyle: 'medium', timeStyle: 'short' })}</td><td>${escapeHtml(employee ? fullName(employee) : state.profile?.user ? fullName(state.profile.user) : '-')}</td><td>${escapeHtml(item.site?.name || '-')}</td><td>${item.type === 'CHECK_IN' ? 'Entrada' : 'Salida'}</td><td><span class="status-pill ${item.status === 'ON_TIME' ? 'status-approved' : 'status-pending'}">${escapeHtml(attendanceStatusLabel(item.status))}</span></td><td>${escapeHtml(item.approximateAddress || `${Number(item.distanceMeters || 0).toFixed(1)} m`)}</td><td>${escapeHtml(item.device || item.browser || '-')}</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="7">No hay asistencias para el período indicado.</td></tr>';
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadOrganizationReferences() {
  const [companies, users, sites, departments, positions, schedules, employees] = await Promise.all(
    [
      api('/companies?limit=100'),
      api('/users?limit=100'),
      api('/sites?limit=100'),
      api('/departments?limit=100'),
      api('/positions?limit=100'),
      api('/schedules?limit=100'),
      api('/employees?limit=100')
    ]
  );
  state.organizationReferences = {
    companies: companies.items || [],
    users: users.items || [],
    sites: sites.items || [],
    departments: departments.items || [],
    positions: positions.items || [],
    schedules: schedules.items || [],
    employees: employees.items || []
  };
  state.companies = state.organizationReferences.companies;
}

function referenceLabel(source, item) {
  if (source === 'users') return `${fullName(item)} (${item.email})`;
  if (source === 'employees') return item.employeeCode;
  return item.name || item.employeeCode || item.id;
}

function organizationFieldMarkup(field, item) {
  const rawValue = item?.[field.name];
  const value =
    rawValue ??
    (typeof field.defaultValue === 'function' ? field.defaultValue() : (field.defaultValue ?? ''));
  const fieldClass = field.wide ? 'dialog-wide' : '';
  if (field.kind === 'checkbox') {
    return `<label class="check-label ${fieldClass}"><input name="${field.name}" type="checkbox" ${value ? 'checked' : ''} /><span>${escapeHtml(field.label)}</span></label>`;
  }
  if (field.kind === 'select') {
    const options = field.options || state.organizationReferences[field.source] || [];
    const choices = Array.isArray(field.options)
      ? options.map((option) => ({ value: option, label: option }))
      : options.map((option) => ({
          value: option.id,
          label: referenceLabel(field.source, option)
        }));
    return `<label class="${fieldClass}">${escapeHtml(field.label)}<select name="${field.name}" ${field.required ? 'required' : ''}>${field.optional ? '<option value="">Sin asignar</option>' : '<option value="">Seleccionar</option>'}${choices.map((choice) => `<option value="${escapeHtml(choice.value)}" ${String(choice.value) === String(value) ? 'selected' : ''}>${escapeHtml(choice.label)}</option>`).join('')}</select></label>`;
  }
  return `<label class="${fieldClass}">${escapeHtml(field.label)}<input name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${field.step ? `step="${field.step}"` : ''} ${field.required ? 'required' : ''} /></label>`;
}

async function openOrganizationDialog(editingId = null) {
  const config = organizationDefinitions[state.organizationEntity];
  try {
    await loadOrganizationReferences();
    state.organizationEditingId = editingId;
    const item = state.organizationItems.find((candidate) => candidate.id === editingId);
    query('#organization-dialog-title').textContent =
      `${editingId ? 'Editar' : 'Crear'} ${config.label.slice(0, -1)}`;
    query('#organization-form-fields').innerHTML = config.fields
      .filter((field) => !(editingId && field.createOnly))
      .map((field) => organizationFieldMarkup(field, item))
      .join('');
    query('#organization-dialog').showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function organizationPayload() {
  const config = organizationDefinitions[state.organizationEntity];
  const form = query('#organization-form');
  const payload = {};
  config.fields.forEach((field) => {
    if (state.organizationEditingId && field.createOnly) return;
    const element = form.elements.namedItem(field.name);
    if (!element) return;
    if (field.kind === 'checkbox') {
      payload[field.name] = element.checked;
      return;
    }
    let value = element.value.trim();
    if (field.kind === 'select' && field.optional && !value) value = null;
    if (field.type === 'number' && value !== '') value = Number(value);
    payload[field.name] = value;
  });
  return payload;
}

async function submitOrganizationForm() {
  const form = query('#organization-form');
  if (!form.reportValidity()) return;
  const config = organizationDefinitions[state.organizationEntity];
  const payload = organizationPayload();
  const button = query('#submit-organization-form');
  button.disabled = true;
  try {
    const isUpdate = Boolean(state.organizationEditingId);
    const endpoint = isUpdate
      ? (config.updateEndpoint || `${config.endpoint}/:id`).replace(
          ':id',
          state.organizationEditingId
        )
      : config.createEndpoint || config.endpoint;
    await api(endpoint, { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    query('#organization-dialog').close();
    showToast('Registro guardado correctamente');
    loadOrganization();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function renderOrganization(items) {
  const config = organizationDefinitions[state.organizationEntity];
  query('#organization-title').textContent = config.label;
  query('#open-employee-import').hidden =
    state.organizationEntity !== 'employees' || !hasPermission('imports.create');
  query('#organization-table-head').innerHTML =
    `<tr>${config.columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}<th></th></tr>`;
  query('#organization-table').innerHTML = items.length
    ? items
        .map((item) => {
          const actions = [
            `<button class="small-button" data-organization-edit="${item.id}" type="button">Editar</button>`,
            `<button class="small-button reject-button" data-organization-delete="${item.id}" type="button">Eliminar</button>`
          ];
          if (state.organizationEntity === 'employees' && hasPermission('employees.update'))
            actions.unshift(
              `<button class="small-button" data-employee-qr="${item.id}" type="button">QR</button>`
            );
          if (state.organizationEntity === 'sites') {
            if (hasPermission('qr.create'))
              actions.unshift(
                `<button class="small-button" data-site-qr="${item.id}" type="button">QR</button>`
              );
            if (hasPermission('qr.read'))
              actions.unshift(
                `<button class="small-button" data-site-qr-history="${item.id}" type="button">Historial QR</button>`
              );
          }
          return `<tr>${config.columns.map(([, getter]) => `<td>${escapeHtml(getter(item))}</td>`).join('')}<td><span class="table-actions">${actions.join('')}</span></td></tr>`;
        })
        .join('')
    : `<tr><td colspan="${config.columns.length + 1}">No hay registros para mostrar.</td></tr>`;
}

async function loadOrganization() {
  try {
    const config = organizationDefinitions[state.organizationEntity];
    const data = await api(`${config.endpoint}?limit=100`);
    state.organizationItems = data.items || [];
    renderOrganization(state.organizationItems);
  } catch (error) {
    showMessage(error.message);
  }
}

async function deleteOrganizationItem(itemId) {
  if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  try {
    const config = organizationDefinitions[state.organizationEntity];
    await api(`${config.endpoint}/${itemId}`, { method: 'DELETE' });
    showToast('Registro eliminado correctamente');
    loadOrganization();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showQrCode({ title, qrImage, token, expiresAt }) {
  query('#qr-dialog-title').textContent = title;
  query('#qr-image').src = qrImage;
  query('#qr-expiration').textContent = expiresAt
    ? `Válido hasta ${formatDate(expiresAt, { dateStyle: 'medium', timeStyle: 'short' })}.`
    : 'Código QR generado correctamente.';
  query('#qr-token').textContent = token || '';
  query('#qr-dialog').showModal();
}

async function generateSiteQr(siteId) {
  try {
    const qr = await api(`/qr/site/${siteId}`, { method: 'POST' });
    showQrCode({
      title: `QR de ${qr.site.name}`,
      qrImage: qr.qrImage,
      token: qr.token,
      expiresAt: qr.expiresAt
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function generateEmployeeQr(employeeId) {
  try {
    const qr = await api(`/employees/${employeeId}/qr`, { method: 'POST' });
    showQrCode({
      title: `QR de empleado ${qr.employeeCode}`,
      qrImage: qr.qrImage,
      token: qr.qrCode
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadSiteQrHistory(siteId) {
  try {
    const data = await api(`/qr/site/${siteId}/history?limit=50`);
    const site = state.organizationItems.find((item) => item.id === siteId);
    query('#qr-history-title').textContent = `Historial QR · ${site?.name || 'Sede'}`;
    query('#qr-history-list').innerHTML = data.items?.length
      ? data.items
          .map((item) => {
            const expired = new Date(item.expiresAt) <= new Date();
            const status = item.usedAt ? 'Consumido' : expired ? 'Vencido' : 'Disponible';
            const statusClass = item.usedAt || expired ? 'status-inactive' : 'status-approved';
            return `<div class="request-row"><span><strong class="row-name">${formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</strong><small class="row-meta">Vence ${formatDate(item.expiresAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><span class="status-pill ${statusClass}">${status}</span></div>`;
          })
          .join('')
      : '<p class="empty-state">No hay códigos QR generados para esta sede.</p>';
    query('#qr-history-dialog').showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openEmployeeImportDialog() {
  query('#employee-import-form').reset();
  query('#employee-import-result').hidden = true;
  query('#employee-import-dialog').showModal();
}

async function uploadEmployeeWorkbook() {
  const form = query('#employee-import-form');
  if (!form.reportValidity()) return;
  const file = form.elements.file.files?.[0];
  if (!file) return;
  const button = query('#submit-employee-import');
  const result = query('#employee-import-result');
  button.disabled = true;
  try {
    const send = () =>
      fetch(`${apiRoot}/employees/import`, {
        method: 'POST',
        headers: { authorization: `Bearer ${state.session?.accessToken || ''}` },
        body: new FormData(form)
      });
    let response = await send();
    if (response.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      response = await send();
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'No fue posible importar el archivo');
    const summary = payload?.data;
    result.textContent = `${summary.created.length} de ${summary.total} empleados importados.${summary.errors.length ? ` ${summary.errors.length} filas con errores.` : ''}`;
    result.hidden = false;
    showToast('Importación procesada correctamente');
    loadOrganization();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function reportParameters(format) {
  const values = Object.fromEntries(new FormData(query('#report-filter-form')));
  const parameters = new URLSearchParams({ format });
  if (values.startDate) parameters.set('startDate', values.startDate);
  if (values.endDate) parameters.set('endDate', values.endDate);
  return parameters;
}

async function loadReports() {
  try {
    const data = await api(`/reports/${state.reportType}?${reportParameters('CSV')}`);
    query('#report-table-head').innerHTML =
      `<tr>${data.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
    query('#report-table').innerHTML = data.rows.length
      ? data.rows
          .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
          .join('')
      : `<tr><td colspan="${data.columns.length}">No hay datos para el período indicado.</td></tr>`;
  } catch (error) {
    showMessage(error.message);
  }
}

async function downloadReport(format) {
  const parameters = reportParameters(format);
  const request = async () => {
    const response = await fetch(`${apiRoot}/reports/${state.reportType}/export?${parameters}`, {
      headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
    });
    if (response.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      return fetch(`${apiRoot}/reports/${state.reportType}/export?${parameters}`, {
        headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
      });
    }
    return response;
  };
  try {
    const response = await request();
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || 'No fue posible exportar el reporte');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `msa-${state.reportType.toLowerCase()}.${format.toLowerCase()}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function dateRangeParameters(formSelector) {
  const values = Object.fromEntries(new FormData(query(formSelector)));
  const parameters = new URLSearchParams();
  if (values.startDate) parameters.set('startDate', values.startDate);
  if (values.endDate) parameters.set('endDate', values.endDate);
  return parameters;
}

function renderStatisticsChart(series) {
  const container = query('#statistics-chart');
  const visible = series.slice(-14);
  const max = Math.max(1, ...visible.flatMap((item) => [item.checkIns || 0, item.late || 0]));
  container.innerHTML = visible.length
    ? visible
        .map((item) => {
          const label = formatDate(`${item.date}T12:00:00`, { weekday: 'short' }).replace('.', '');
          const entries = Math.max(3, Math.round(((item.checkIns || 0) / max) * 100));
          const late = item.late ? Math.max(3, Math.round((item.late / max) * 100)) : 3;
          return `<div class="chart-day"><div class="chart-columns"><span class="chart-bar" style="height:${entries}%"></span><span class="chart-bar late" style="height:${late}%"></span></div><small>${escapeHtml(label)}</small></div>`;
        })
        .join('')
    : '<p class="empty-state">No hay datos estadísticos para el período.</p>';
}

async function loadStatistics() {
  try {
    const data = await api(
      `/attendance/statistics?${dateRangeParameters('#statistics-filter-form')}`
    );
    query('#stat-attendance-rate').textContent = `${data.kpis.attendanceRate}%`;
    query('#stat-punctuality-rate').textContent = `${data.kpis.punctualityRate}%`;
    query('#stat-worked-hours').textContent = `${data.totals.workedHours} h`;
    query('#stat-absences').textContent = data.totals.absences;
    renderStatisticsChart(data.series || []);
  } catch (error) {
    showMessage(error.message);
  }
}

function calendarPeriod() {
  const input = query('#calendar-month');
  if (!input.value) input.value = new Date().toISOString().slice(0, 7);
  const [year, month] = input.value.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function calendarClass(category) {
  return (
    {
      HOLIDAY: 'holiday',
      VACATION: 'vacation',
      LICENSE: 'license'
    }[category] || 'attendance'
  );
}

async function loadCalendar() {
  try {
    const data = await api(`/attendance/calendar?${new URLSearchParams(calendarPeriod())}`);
    const events = data.events || [];
    query('#calendar-events').innerHTML = events.length
      ? events
          .map(
            (event) =>
              `<article class="calendar-event ${calendarClass(event.category)}"><small>${formatDate(event.start, { dateStyle: 'medium', timeStyle: event.category === 'ATTENDANCE' ? 'short' : undefined })}</small><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.detail || attendanceStatusLabel(event.status))}</small></article>`
          )
          .join('')
      : '<p class="empty-state">No hay eventos para el mes seleccionado.</p>';
  } catch (error) {
    showMessage(error.message);
  }
}

function announcementStatusClass(status) {
  return (
    { DRAFT: 'status-pending', PUBLISHED: 'status-approved', ARCHIVED: 'status-inactive' }[
      status
    ] || 'status-inactive'
  );
}

async function loadAnnouncements() {
  try {
    const data = await api('/announcements?limit=100');
    const items = data.items || [];
    query('#announcement-list').innerHTML = items.length
      ? items
          .map((item) => {
            const actions =
              item.status === 'DRAFT'
                ? `<button class="small-button approve-button" data-announcement-publish="${item.id}" type="button">Publicar</button>`
                : item.status === 'PUBLISHED'
                  ? `<button class="small-button reject-button" data-announcement-archive="${item.id}" type="button">Archivar</button>`
                  : '';
            return `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.title)}</strong><small class="row-meta">${escapeHtml(item.body)}${item.expiresAt ? ` · vence ${formatDate(item.expiresAt)}` : ''}</small></span><span class="request-actions"><span class="status-pill ${announcementStatusClass(item.status)}">${escapeHtml(item.status)}</span>${actions}</span></div>`;
          })
          .join('')
      : '<p class="empty-state">No hay anuncios creados.</p>';
  } catch (error) {
    showMessage(error.message);
  }
}

async function openAnnouncementDialog() {
  try {
    const [companies, roles] = await Promise.all([
      api('/companies?limit=100'),
      api('/roles?limit=100')
    ]);
    state.companies = companies.items || [];
    query('#announcement-company').innerHTML = state.companies
      .map((company) => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
      .join('');
    query('#announcement-role').innerHTML =
      `<option value="">Todo el personal</option>${(roles.items || []).map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join('')}`;
    query('#announcement-dialog').showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function createAnnouncement() {
  const form = query('#announcement-form');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const button = query('#submit-announcement-form');
  button.disabled = true;
  try {
    await api('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        audienceRoleId: values.audienceRoleId || null,
        expiresAt: values.expiresAt || null
      })
    });
    query('#announcement-dialog').close();
    form.reset();
    showToast('Anuncio creado correctamente');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function publishAnnouncement(id) {
  try {
    await api(`/announcements/${id}/publish`, { method: 'PATCH' });
    showToast('Anuncio publicado y notificaciones enviadas');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function archiveAnnouncement(id) {
  try {
    await api(`/announcements/${id}/archive`, { method: 'PATCH' });
    showToast('Anuncio archivado');
    loadAnnouncements();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadDevices() {
  try {
    const data = await api('/devices?limit=100');
    const items = data.items || [];
    query('#devices-table').innerHTML = items.length
      ? items
          .map((item) => {
            const actions =
              item.status === 'BLOCKED'
                ? `<button class="small-button" data-device-id="${item.id}" data-device-status="AUTHORIZED" type="button">Autorizar</button>`
                : `<button class="small-button approve-button" data-device-id="${item.id}" data-device-status="AUTHORIZED" type="button">Autorizar</button><button class="small-button reject-button" data-device-id="${item.id}" data-device-status="BLOCKED" type="button">Bloquear</button>`;
            return `<tr><td>${escapeHtml(fullName(item.user))}<small class="row-meta">${escapeHtml(item.user?.email || '-')}</small></td><td>${escapeHtml(item.name || item.userAgent || '-')}</td><td>${escapeHtml(item.ipAddress || '-')}</td><td>${formatDate(item.lastSeenAt, { dateStyle: 'medium', timeStyle: 'short' })}</td><td><span class="status-pill ${item.status === 'AUTHORIZED' ? 'status-approved' : item.status === 'BLOCKED' ? 'status-rejected' : 'status-pending'}">${escapeHtml(item.status)}</span></td><td><span class="table-actions">${actions}</span></td></tr>`;
          })
          .join('')
      : '<tr><td colspan="6">No hay dispositivos registrados.</td></tr>';
  } catch (error) {
    showMessage(error.message);
  }
}

async function setDeviceStatus(id, status) {
  try {
    await api(`/devices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast('Estado de dispositivo actualizado');
    loadDevices();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function selectedCompanyId() {
  return query('#settings-company').value;
}

function renderBackups(items) {
  query('#backup-list').innerHTML = items.length
    ? items
        .map((item) => {
          const action =
            item.status === 'COMPLETED'
              ? `<button class="small-button reject-button" data-backup-restore="${item.id}" type="button">Restaurar</button>`
              : '';
          return `<div class="request-row"><span><strong class="row-name">${item.type === 'DATABASE' ? 'Base de datos' : 'Archivos'}</strong><small class="row-meta">${formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}${item.errorMessage ? ` · ${escapeHtml(item.errorMessage)}` : ''}</small></span><span class="request-actions"><span class="status-pill ${item.status === 'COMPLETED' ? 'status-approved' : item.status === 'FAILED' ? 'status-rejected' : 'status-pending'}">${escapeHtml(item.status)}</span>${action}</span></div>`;
        })
        .join('')
    : '<p class="empty-state">No hay respaldos registrados.</p>';
}

function updateBackupFrequencyFields() {
  const form = query('#backup-schedule-form');
  query('#backup-day-of-week-field').hidden = form.elements.frequency.value !== 'WEEKLY';
}

async function loadCompanySettings() {
  const companyId = selectedCompanyId();
  if (!companyId) return;
  const company = state.companies.find((item) => item.id === companyId);
  if (company) {
    const form = query('#company-identity-form');
    form.elements.name.value = company.name || '';
    form.elements.timeZone.value = company.timeZone || 'America/Lima';
    form.elements.email.value = company.email || '';
    form.elements.logoUrl.value = company.logoUrl || '';
  }
  try {
    const [settings, schedule, backupData] = await Promise.all([
      api(`/companies/${companyId}/settings`),
      api(`/backups/schedule?companyId=${companyId}`),
      api(`/backups?companyId=${companyId}&limit=20`)
    ]);
    const values = Object.fromEntries(
      (settings || []).map((setting) => [setting.key, setting.value])
    );
    const rules = query('#company-settings-form');
    rules.elements.qrExpiration.value = values.qrExpirationSeconds || '';
    rules.elements.gpsRadius.value = values.gpsRadiusMeters || '';
    const form = query('#backup-schedule-form');
    form.elements.enabled.checked = Boolean(schedule?.enabled);
    const scheduleValue = schedule || null;
    form.elements.frequency.value = scheduleValue?.frequency || 'DAILY';
    form.elements.dayOfWeek.value = scheduleValue?.dayOfWeek ?? 1;
    form.elements.hour.value = scheduleValue?.hour ?? 2;
    form.elements.minute.value = scheduleValue?.minute ?? 0;
    updateBackupFrequencyFields();
    renderBackups(backupData.items || []);
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadSettings() {
  try {
    const data = await api('/companies?limit=100');
    state.companies = data.items || [];
    const select = query('#settings-company');
    const previous = select.value;
    select.innerHTML = state.companies
      .map((company) => `<option value="${company.id}">${escapeHtml(company.name)}</option>`)
      .join('');
    if (previous && state.companies.some((company) => company.id === previous))
      select.value = previous;
    await loadCompanySettings();
  } catch (error) {
    showMessage(error.message);
  }
}

async function saveCompanyIdentity(event) {
  event.preventDefault();
  const form = query('#company-identity-form');
  if (!form.reportValidity() || !selectedCompanyId()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api(`/companies/${selectedCompanyId()}/identity`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...values,
        email: values.email || null,
        logoUrl: values.logoUrl || null
      })
    });
    showToast('Identidad de empresa actualizada');
    loadSettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveCompanySettings(event) {
  event.preventDefault();
  const form = query('#company-settings-form');
  if (!selectedCompanyId()) return;
  const values = Object.fromEntries(new FormData(form));
  const settings = [
    { key: 'qrExpirationSeconds', value: values.qrExpiration || '' },
    { key: 'gpsRadiusMeters', value: values.gpsRadius || '' }
  ].filter((setting) => setting.value !== '');
  if (!settings.length) return showToast('Ingrese al menos una regla', 'error');
  try {
    await api(`/companies/${selectedCompanyId()}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
    showToast('Reglas operativas actualizadas');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function startBackup(type) {
  if (!selectedCompanyId()) return;
  try {
    await api('/backups', {
      method: 'POST',
      body: JSON.stringify({ companyId: selectedCompanyId(), type })
    });
    showToast('Respaldo iniciado en segundo plano');
    loadCompanySettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveBackupSchedule(event) {
  event.preventDefault();
  const form = query('#backup-schedule-form');
  if (!selectedCompanyId()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/backups/schedule', {
      method: 'PUT',
      body: JSON.stringify({
        companyId: selectedCompanyId(),
        enabled: form.elements.enabled.checked,
        frequency: values.frequency,
        hour: Number(values.hour),
        minute: Number(values.minute),
        dayOfWeek: Number(values.dayOfWeek),
        type: 'DATABASE'
      })
    });
    showToast('Programación de respaldo guardada');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function restoreBackup(id) {
  if (!window.confirm('La restauración sobrescribirá datos o archivos actuales. ¿Desea continuar?'))
    return;
  try {
    await api(`/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RESTORE' })
    });
    showToast('Restauración completada');
    loadCompanySettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderSystemStatus(data) {
  const metrics = data.metrics || {};
  const entries = [
    ['Base de datos', data.database],
    ['Tiempo activo', `${data.uptimeSeconds || 0} s`],
    ['Empleados activos', metrics.activeEmployees || 0],
    ['Solicitudes pendientes', metrics.pendingRequests || 0],
    ['Notificaciones sin leer', metrics.unreadNotifications || 0]
  ];
  query('#system-status').innerHTML = entries
    .map(
      ([label, value]) =>
        `<div class="system-status-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
    )
    .join('');
}

async function loadAudit() {
  try {
    const [status, audits, logs] = await Promise.all([
      api('/system/status'),
      api('/audit-logs?limit=30'),
      api('/system/logs?kind=combined&limit=30')
    ]);
    renderSystemStatus(status);
    query('#audit-list').innerHTML = (audits.items || []).length
      ? audits.items
          .map(
            (item) =>
              `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.action)} · ${escapeHtml(item.entity)}</strong><small class="row-meta">${escapeHtml(fullName(item.user))} · ${formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })} · ${escapeHtml(item.ipAddress || '-')}</small></span></div>`
          )
          .join('')
      : '<p class="empty-state">No hay eventos de auditoría.</p>';
    query('#system-log-list').innerHTML = logs.length
      ? logs
          .map(
            (entry) => `<pre class="system-log-entry">${escapeHtml(JSON.stringify(entry))}</pre>`
          )
          .join('')
      : '<p class="empty-state">No hay eventos del sistema.</p>';
  } catch (error) {
    showMessage(error.message);
  }
}

async function analyzeDatabase() {
  try {
    await api('/system/analyze', { method: 'POST' });
    showToast('Análisis de base de datos iniciado');
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function cleanSystemData() {
  if (!window.confirm('Se eliminarán tokens vencidos y auditorías antiguas. ¿Desea continuar?'))
    return;
  try {
    await api('/system/cleanup', { method: 'POST', body: JSON.stringify({ retentionDays: 90 }) });
    showToast('Limpieza de datos completada');
    loadAudit();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderMyRequests(items) {
  query('#my-request-list').innerHTML = items.length
    ? items
        .map((item) => {
          const date = item.date || item.startDate;
          return `<div class="request-row"><span><strong class="row-name">${escapeHtml(item.type)}</strong><small class="row-meta">${formatDate(date)} · ${escapeHtml(item.reason || item.licenseType || '-')}</small></span><span class="status-pill ${requestStatusClass(item.status)}">${escapeHtml(item.status)}</span></div>`;
        })
        .join('')
    : '<p class="empty-state">No hay solicitudes registradas.</p>';
}

async function loadProfile() {
  try {
    const profile = await api('/me/profile');
    state.profile = profile;
    query('#profile-summary').innerHTML =
      `<strong>${escapeHtml(fullName(profile.user))}</strong><small>${escapeHtml(profile.user.email)}</small><small>Código: ${escapeHtml(profile.employeeCode)} · ${escapeHtml(profile.company?.name || '-')}</small><small>${escapeHtml(profile.site?.name || 'Sin sede')} · ${escapeHtml(profile.schedule?.name || 'Sin horario')}</small>`;
    query('#profile-first-name').value = profile.user.firstName || '';
    query('#profile-last-name').value = profile.user.lastName || '';
    query('#profile-photo-url').value = profile.profilePhotoUrl || '';
    const [devices, requests] = await Promise.all([api('/me/devices'), api('/me/requests')]);
    query('#profile-device-list').innerHTML = devices.length
      ? devices
          .map(
            (device) =>
              `<div class="request-row"><span><strong class="row-name">${escapeHtml(device.name || device.userAgent || 'Dispositivo')}</strong><small class="row-meta">${formatDate(device.lastSeenAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><button class="small-button reject-button" data-own-device-delete="${device.id}" type="button">Quitar</button></div>`
          )
          .join('')
      : '<p class="empty-state">No hay dispositivos registrados.</p>';
    renderMyRequests(requests.items || []);
  } catch (error) {
    state.profile = null;
    query('#profile-summary').innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    query('#profile-device-list').innerHTML = '';
    query('#my-request-list').innerHTML = '';
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const form = query('#profile-form');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ ...values, profilePhotoUrl: values.profilePhotoUrl || null })
    });
    showToast('Perfil actualizado correctamente');
    loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function changeOwnPassword(event) {
  event.preventDefault();
  const form = query('#profile-password-form');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify(values) });
    showToast('Contraseña actualizada. Inicie sesión nuevamente.');
    await signOut(false);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteOwnDevice(id) {
  try {
    await api(`/me/devices/${id}`, { method: 'DELETE' });
    showToast('Dispositivo eliminado');
    loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function updateClock() {
  query('#auth-clock').textContent = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
}

function setupLogoFallbacks() {
  [
    ['#brand-logo', '#brand-fallback'],
    ['#sidebar-logo', '#sidebar-fallback']
  ].forEach(([imageSelector, fallbackSelector]) => {
    const image = query(imageSelector);
    const fallback = query(fallbackSelector);
    const showFallback = () => {
      image.hidden = true;
      fallback.hidden = false;
    };
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && !image.naturalWidth) showFallback();
  });
}

function updateAccount() {
  const user = state.session?.user;
  if (!user) return;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  query('#account-name').textContent = fullName(user);
  query('#account-role').textContent = user.role || 'Usuario';
  query('#account-initials').textContent = initials || 'MS';
}

function setView(viewName) {
  queryAll('.view').forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
    view.classList.toggle('active', view.dataset.view === viewName);
  });
  queryAll('.nav-item').forEach((item) =>
    item.classList.toggle('active', item.dataset.viewTarget === viewName)
  );
  const titles = {
    dashboard: ['Operación', 'Resumen general'],
    attendance: ['Registro seguro', 'Asistencia'],
    history: ['Trazabilidad', 'Historial de asistencias'],
    requests: ['Administración', 'Solicitudes'],
    organization: ['Estructura', 'Organización'],
    reports: ['Exportación', 'Reportes'],
    statistics: ['Indicadores', 'Estadísticas'],
    calendar: ['Planificación', 'Calendario operativo'],
    announcements: ['Comunicación interna', 'Anuncios'],
    devices: ['Seguridad operativa', 'Dispositivos'],
    settings: ['Empresa y continuidad', 'Configuración'],
    audit: ['Mantenimiento', 'Auditoría y logs'],
    profile: ['Autoservicio', 'Mi perfil'],
    users: ['Accesos', 'Usuarios'],
    roles: ['Control de acceso', 'Roles y permisos'],
    sessions: ['Seguridad', 'Sesiones activas']
  };
  query('#page-kicker').textContent = titles[viewName][0];
  query('#page-title').textContent = titles[viewName][1];
  query('#sidebar').classList.remove('open');
  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'attendance') {
    renderOfflinePanel();
    void loadAttendanceMap();
    void synchronizeOfflineQueue();
  }
  if (viewName === 'history') loadHistory();
  if (viewName === 'requests') loadRequests();
  if (viewName === 'organization') loadOrganization();
  if (viewName === 'reports') loadReports();
  if (viewName === 'statistics') loadStatistics();
  if (viewName === 'calendar') loadCalendar();
  if (viewName === 'announcements') loadAnnouncements();
  if (viewName === 'devices') loadDevices();
  if (viewName === 'settings') loadSettings();
  if (viewName === 'audit') loadAudit();
  if (viewName === 'profile') loadProfile();
  if (viewName === 'users') loadUsers();
  if (viewName === 'roles') loadRolesAndPermissions();
  if (viewName === 'sessions') loadSessions();
}

function showApp() {
  query('#auth-screen').hidden = true;
  query('#app-shell').hidden = false;
  updateAccount();
  setView(state.session?.user?.permissions?.includes('dashboard.read') ? 'dashboard' : 'profile');
  void loadNotifications();
  void registerKnownDevice();
  void synchronizeOfflineQueue();
}

function showLogin() {
  query('#app-shell').hidden = true;
  query('#auth-screen').hidden = false;
  query('#login-card').hidden = false;
  query('#recovery-card').hidden = true;
  query('#login-form').reset();
}

async function login(event) {
  event.preventDefault();
  const email = query('#login-email').value.trim();
  const password = query('#login-password').value;
  const rememberMe = query('#remember-me').checked;
  const button = query('#login-form button[type="submit"]');
  button.disabled = true;
  try {
    const data = await rawRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    saveSession(data, rememberMe);
    clearMessage();
    showApp();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function signOut(notify = true) {
  const refreshToken = state.session?.refreshToken;
  if (refreshToken) {
    try {
      await rawRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    } catch {
      /* The local session must still be cleared. */
    }
  }
  clearSession();
  showLogin();
  if (notify) showToast('Sesión cerrada correctamente');
}

function renderDashboard(summary) {
  const safe = summary || {};
  const kpi = safe.indicadoresKpi || {};
  query('#dashboard-date').textContent = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());
  query('#metric-present').textContent = safe.personalPresente ?? 0;
  query('#metric-attendance').textContent = `${kpi.tasaAsistencia ?? 0}% de asistencia`;
  query('#metric-absent').textContent = safe.personalAusente ?? 0;
  query('#metric-late').textContent = safe.tardanzas ?? 0;
  query('#metric-hours').textContent = `${safe.horasTrabajadas ?? 0} h`;
  query('#metric-average-hours').textContent = `${kpi.horasPromedioPorEmpleado ?? 0} h por persona`;
  query('#metric-overtime').textContent = `${safe.horasExtrasAprobadas ?? 0} h`;
  query('#metric-permissions').textContent = safe.permisosPendientes ?? 0;
  renderChart(safe.graficos?.asistenciaUltimosSieteDias || []);
  renderActivity(safe.actividadReciente || []);
}

function renderChart(days) {
  const container = query('#attendance-chart');
  const max = Math.max(1, ...days.flatMap((day) => [day.entradas || 0, day.tardanzas || 0]));
  container.innerHTML = days.length
    ? days
        .map((day) => {
          const label = formatDate(`${day.fecha}T12:00:00`, { weekday: 'short' }).replace('.', '');
          const entries = Math.max(3, Math.round(((day.entradas || 0) / max) * 100));
          const late = day.tardanzas ? Math.max(3, Math.round((day.tardanzas / max) * 100)) : 3;
          return `<div class="chart-day"><div class="chart-columns"><span class="chart-bar" style="height:${entries}%"></span><span class="chart-bar late" style="height:${late}%"></span></div><small>${escapeHtml(label)}</small></div>`;
        })
        .join('')
    : '<p class="empty-state">Sin movimientos para el período.</p>';
}

function renderActivity(items) {
  const container = query('#activity-list');
  container.innerHTML = items.length
    ? items
        .map((item) => {
          const name = fullName(item.employee?.user);
          const event = item.type === 'CHECK_IN' ? 'Entrada' : 'Salida';
          return `<div class="activity-row"><span><strong class="row-name">${escapeHtml(name)}</strong><small class="row-meta">${escapeHtml(item.approximateAddress || 'Sin ubicación')} · ${formatTime(item.recordedAt)}</small></span><span class="event-pill">${event}</span></div>`;
        })
        .join('')
    : '<p class="empty-state">Aún no hay actividad registrada hoy.</p>';
}

async function loadDashboard() {
  try {
    clearMessage();
    renderDashboard(await api('/dashboard/summary'));
  } catch (error) {
    showMessage(error.message);
  }
}

async function loadRoster(kind) {
  const endpoint = {
    present: '/dashboard/present',
    absent: '/dashboard/absent',
    late: '/dashboard/late'
  }[kind];
  const labels = { present: 'Personal presente', absent: 'Personal ausente', late: 'Tardanzas' };
  try {
    const items = await api(endpoint);
    query('#roster-title').textContent = labels[kind];
    query('#roster-panel').hidden = false;
    query('#roster-list').innerHTML = items.length
      ? items
          .map((item) => {
            const person = item.employee?.user || item.user;
            const meta = item.employeeCode || item.employee?.employeeCode || item.status || '-';
            return `<div class="roster-row"><span><strong class="row-name">${escapeHtml(fullName(person))}</strong><small class="row-meta">${escapeHtml(meta)}</small></span><span class="status-pill ${item.status === 'LATE' ? 'status-pending' : 'status-active'}">${escapeHtml(item.status || 'Activo')}</span></div>`;
          })
          .join('')
      : '<p class="empty-state">No hay registros para mostrar.</p>';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function requestStatusClass(status) {
  return (
    {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      CANCELLED: 'status-inactive'
    }[status] || 'status-inactive'
  );
}

const requestDefinitions = {
  work: {
    resource: 'work-permissions',
    adminEndpoint: '/requests/admin/work-permissions?limit=50',
    ownEndpoint: '/requests/work-permissions',
    reviewEndpoint: (id) => `/work-permissions/${id}/review`,
    cancelEndpoint: (id) => `/requests/work-permissions/${id}`
  },
  overtime: {
    resource: 'overtime-requests',
    adminEndpoint: '/requests/admin/overtime?limit=50',
    ownEndpoint: '/requests/overtime',
    reviewEndpoint: (id) => `/overtime-requests/${id}/review`,
    cancelEndpoint: (id) => `/requests/overtime/${id}`
  },
  vacation: {
    resource: 'vacations',
    adminEndpoint: '/requests/admin/vacations?limit=50',
    ownEndpoint: '/requests/vacations',
    reviewEndpoint: (id) => `/vacations/${id}/review`,
    cancelEndpoint: (id) => `/requests/vacations/${id}`
  },
  license: {
    resource: 'licenses',
    adminEndpoint: '/requests/admin/licenses?limit=50',
    ownEndpoint: '/requests/licenses',
    reviewEndpoint: (id) => `/licenses/${id}/review`,
    cancelEndpoint: (id) => `/requests/licenses/${id}`
  }
};

function requestDateRange(item, type) {
  if (type === 'overtime') return formatDate(item.date);
  return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
}

function requestDetail(item, type) {
  if (type === 'overtime') return `${item.requestedMinutes} min · ${item.reason}`;
  if (type === 'license') return `${item.type} · ${item.reason || 'Sin detalle'}`;
  return item.reason || 'Sin detalle';
}

function renderRequests(items, target, type, options) {
  const container = query(target);
  container.innerHTML = items.length
    ? items
        .map((item) => {
          const employee = item.employee?.user
            ? `${fullName(item.employee.user)} · ${item.employee.employeeCode}`
            : '';
          const actions =
            item.status === 'PENDING' && options.canReview
              ? `<span class="request-actions"><button class="small-button approve-button" data-review-type="${type}" data-review-id="${item.id}" data-review-status="APPROVED" type="button">Aprobar</button><button class="small-button reject-button" data-review-type="${type}" data-review-id="${item.id}" data-review-status="REJECTED" type="button">Rechazar</button></span>`
              : item.status === 'PENDING' && options.canCancel
                ? `<span class="request-actions"><button class="small-button reject-button" data-request-cancel-type="${type}" data-request-cancel-id="${item.id}" type="button">Cancelar</button></span>`
                : `<span class="status-pill ${requestStatusClass(item.status)}">${escapeHtml(item.status)}</span>`;
          return `<div class="request-row"><span><strong class="row-name">${escapeHtml(requestDateRange(item, type))}</strong><small class="row-meta">${escapeHtml([employee, requestDetail(item, type)].filter(Boolean).join(' · '))}</small></span>${actions}</div>`;
        })
        .join('')
    : '<p class="empty-state">No hay solicitudes registradas.</p>';
}

async function loadRequestCollection(type) {
  const definition = requestDefinitions[type];
  if (hasPermission(`${definition.resource}.read`)) {
    const data = await api(definition.adminEndpoint);
    return {
      items: data.items || [],
      canReview: hasPermission(`${definition.resource}.update`),
      canCancel: false
    };
  }
  const data = await api(definition.ownEndpoint);
  return {
    items: Array.isArray(data) ? data : data.items || [],
    canReview: false,
    canCancel: true
  };
}

async function loadRequests() {
  try {
    clearMessage();
    const [work, overtime, vacation, license] = await Promise.all([
      loadRequestCollection('work'),
      loadRequestCollection('overtime'),
      loadRequestCollection('vacation'),
      loadRequestCollection('license')
    ]);
    query('#work-request-count').textContent = work.items.filter(
      (item) => item.status === 'PENDING'
    ).length;
    query('#overtime-request-count').textContent = overtime.items.filter(
      (item) => item.status === 'PENDING'
    ).length;
    query('#vacation-request-count').textContent = vacation.items.filter(
      (item) => item.status === 'PENDING'
    ).length;
    query('#license-request-count').textContent = license.items.filter(
      (item) => item.status === 'PENDING'
    ).length;
    renderRequests(work.items, '#work-request-list', 'work', work);
    renderRequests(overtime.items, '#overtime-request-list', 'overtime', overtime);
    renderRequests(vacation.items, '#vacation-request-list', 'vacation', vacation);
    renderRequests(license.items, '#license-request-list', 'license', license);
  } catch (error) {
    showMessage(error.message);
  }
}

async function reviewRequest(button) {
  const type = button.dataset.reviewType;
  const id = button.dataset.reviewId;
  const status = button.dataset.reviewStatus;
  button.disabled = true;
  try {
    await api(requestDefinitions[type].reviewEndpoint(id), {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast('Solicitud actualizada');
    loadRequests();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}

function setRequestFormType() {
  const type = query('#request-type').value;
  const isOvertime = type === 'OVERTIME';
  const isLicense = type === 'LICENSE';
  query('#request-start-date-field').hidden = isOvertime;
  query('#request-end-date-field').hidden = isOvertime;
  query('#request-date-field').hidden = !isOvertime;
  query('#request-minutes-field').hidden = !isOvertime;
  query('#request-license-type-field').hidden = !isLicense;
  query('#request-form').elements.startDate.required = !isOvertime;
  query('#request-form').elements.endDate.required = !isOvertime;
  query('#request-form').elements.date.required = isOvertime;
  query('#request-form').elements.requestedMinutes.required = isOvertime;
  query('#request-form').elements.licenseType.required = isLicense;
  query('#request-form').elements.reason.required = type === 'WORK_PERMISSION' || isOvertime;
}

function openRequestDialog() {
  const form = query('#request-form');
  form.reset();
  setRequestFormType();
  query('#request-dialog').showModal();
}

async function submitRequestForm() {
  const form = query('#request-form');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const button = query('#submit-request-form');
  const requestByType = {
    WORK_PERMISSION: {
      endpoint: '/requests/work-permissions',
      body: { startDate: values.startDate, endDate: values.endDate, reason: values.reason }
    },
    OVERTIME: {
      endpoint: '/requests/overtime',
      body: {
        date: values.date,
        requestedMinutes: Number(values.requestedMinutes),
        reason: values.reason
      }
    },
    VACATION: {
      endpoint: '/requests/vacations',
      body: {
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined
      }
    },
    LICENSE: {
      endpoint: '/requests/licenses',
      body: {
        startDate: values.startDate,
        endDate: values.endDate,
        type: values.licenseType,
        reason: values.reason || undefined
      }
    }
  };
  const request = requestByType[values.requestType];
  button.disabled = true;
  try {
    await api(request.endpoint, { method: 'POST', body: JSON.stringify(request.body) });
    query('#request-dialog').close();
    showToast('Solicitud enviada correctamente');
    loadRequests();
    if (state.profile) loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function cancelRequest(button) {
  const type = button.dataset.requestCancelType;
  const id = button.dataset.requestCancelId;
  if (!window.confirm('¿Cancelar esta solicitud pendiente?')) return;
  button.disabled = true;
  try {
    await api(requestDefinitions[type].cancelEndpoint(id), { method: 'DELETE' });
    showToast('Solicitud cancelada');
    loadRequests();
    if (state.profile) loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}

function renderUsers(items) {
  query('#users-table').innerHTML = items.length
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
          return `<tr><td><strong class="row-name">${escapeHtml(fullName(user))}</strong><small class="row-meta">${escapeHtml(user.email)}</small></td><td>${escapeHtml(user.role?.name || '-')}</td><td><span class="status-pill ${statusClass}">${escapeHtml(user.status)}</span></td><td>${recovery}/2 preguntas</td><td><span class="table-actions"><button class="small-button" data-user-id="${user.id}" data-user-status="${nextStatus}" type="button">${nextStatus === 'ACTIVE' ? 'Activar' : 'Desactivar'}</button></span></td></tr>`;
        })
        .join('')
    : '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
}

async function loadUsers() {
  try {
    clearMessage();
    const data = await api('/users?limit=100');
    renderUsers(data.items || []);
  } catch (error) {
    showMessage(error.message);
  }
}

async function setUserStatus(button) {
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

async function loadRolesAndPermissions() {
  try {
    clearMessage();
    const [roles, permissions] = await Promise.all([
      api('/roles?limit=100'),
      api('/permissions?limit=100')
    ]);
    state.roles = roles.items || [];
    state.permissions = permissions.items || [];
    renderRoles();
    if (state.roles.length) await selectRole(state.selectedRoleId || state.roles[0].id);
  } catch (error) {
    showMessage(error.message);
  }
}

function renderRoles() {
  query('#roles-list').innerHTML = state.roles.length
    ? state.roles
        .map(
          (role) =>
            `<button class="role-row ${role.id === state.selectedRoleId ? 'active' : ''}" data-role-id="${role.id}" type="button"><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.description || 'Sin descripción')}</small></button>`
        )
        .join('')
    : '<p class="empty-state">No hay roles configurados.</p>';
}

async function selectRole(roleId) {
  state.selectedRoleId = roleId;
  renderRoles();
  query('#save-role-permissions').disabled = true;
  try {
    const role = await api(`/roles/${roleId}/permissions`);
    query('#selected-role-name').textContent = role.name;
    const assigned = new Set((role.rolePermissions || []).map((entry) => entry.permission.id));
    query('#permissions-list').innerHTML = state.permissions.length
      ? state.permissions
          .map(
            (permission) =>
              `<label class="permission-option"><input type="checkbox" value="${permission.id}" ${assigned.has(permission.id) ? 'checked' : ''} /><span>${escapeHtml(permission.code)}</span></label>`
          )
          .join('')
      : '<p class="empty-state">No hay permisos configurados.</p>';
    query('#save-role-permissions').disabled = false;
  } catch (error) {
    showMessage(error.message);
  }
}

async function saveRolePermissions() {
  if (!state.selectedRoleId) return;
  const permissionIds = queryAll('#permissions-list input:checked').map((input) => input.value);
  const button = query('#save-role-permissions');
  button.disabled = true;
  try {
    await api(`/roles/${state.selectedRoleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds })
    });
    showToast('Permisos actualizados; las sesiones afectadas fueron cerradas');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function loadSessions() {
  try {
    clearMessage();
    const sessions = await api('/auth/sessions');
    query('#sessions-list').innerHTML = sessions.length
      ? sessions
          .map(
            (session) =>
              `<div class="session-row"><span><strong class="row-name">${escapeHtml(session.userAgent || 'Dispositivo no identificado')}</strong><small class="row-meta">${escapeHtml(session.ipAddress || 'IP no disponible')} · ${formatDate(session.lastActiveAt, { dateStyle: 'medium', timeStyle: 'short' })}${session.rememberMe ? ' · Recordada' : ''}</small></span>${session.current ? '<span class="status-pill status-active">Actual</span>' : `<button class="quiet-button" data-session-id="${session.id}" type="button">Cerrar</button>`}</div>`
          )
          .join('')
      : '<p class="empty-state">No hay sesiones activas.</p>';
  } catch (error) {
    showMessage(error.message);
  }
}

async function revokeSession(button) {
  button.disabled = true;
  try {
    await api(`/auth/sessions/${button.dataset.sessionId}`, { method: 'DELETE' });
    showToast('Sesión cerrada');
    loadSessions();
  } catch (error) {
    showToast(error.message, 'error');
    button.disabled = false;
  }
}

async function openUserDialog() {
  if (!state.roles.length) await loadRolesAndPermissions();
  query('#new-user-role').innerHTML = state.roles
    .map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`)
    .join('');
  query('#user-dialog').showModal();
}

async function createUser() {
  const form = query('#create-user-form');
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const button = query('#submit-user-form');
  button.disabled = true;
  try {
    await api('/users', { method: 'POST', body: JSON.stringify(values) });
    query('#user-dialog').close();
    form.reset();
    showToast('Usuario creado correctamente');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function showRecovery() {
  query('#login-card').hidden = true;
  query('#recovery-card').hidden = false;
  query('#recovery-start-form').hidden = false;
  query('#recovery-reset-form').hidden = true;
}

function showLoginForm() {
  state.recovery = null;
  query('#recovery-card').hidden = true;
  query('#login-card').hidden = false;
  query('#recovery-start-form').reset();
  query('#recovery-reset-form').reset();
}

async function startRecovery(event) {
  event.preventDefault();
  const email = query('#recovery-email').value.trim();
  try {
    const data = await rawRequest('/auth/password-recovery/start', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (!data?.recoveryToken || !data.questions?.length)
      throw new Error('No hay preguntas de recuperación disponibles para esta cuenta');
    state.recovery = { email, token: data.recoveryToken, questions: data.questions };
    query('#recovery-questions').innerHTML = data.questions
      .map(
        (question, index) =>
          `<label>${escapeHtml(question.question)}<input data-question-id="${question.id}" type="text" autocomplete="off" required aria-label="Respuesta ${index + 1}" /></label>`
      )
      .join('');
    query('#recovery-start-form').hidden = true;
    query('#recovery-reset-form').hidden = false;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function resetPassword(event) {
  event.preventDefault();
  if (!state.recovery) return;
  const answers = queryAll('#recovery-questions input').map((input) => ({
    questionId: input.dataset.questionId,
    answer: input.value.trim()
  }));
  const newPassword = query('#recovery-password').value;
  try {
    await rawRequest('/auth/password-recovery/reset', {
      method: 'POST',
      body: JSON.stringify({
        email: state.recovery.email,
        recoveryToken: state.recovery.token,
        answers,
        newPassword
      })
    });
    showToast('Contraseña actualizada. Ya puedes iniciar sesión.');
    showLoginForm();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function bindEvents() {
  query('#login-form').addEventListener('submit', login);
  query('#show-recovery').addEventListener('click', showRecovery);
  queryAll('[data-back-to-login]').forEach((button) =>
    button.addEventListener('click', showLoginForm)
  );
  query('#recovery-start-form').addEventListener('submit', startRecovery);
  query('#recovery-reset-form').addEventListener('submit', resetPassword);
  query('#logout-button').addEventListener('click', () => signOut());
  query('#refresh-dashboard').addEventListener('click', loadDashboard);
  query('#attendance-form').addEventListener('submit', submitAttendance);
  query('#capture-location').addEventListener('click', () =>
    captureLocation().catch((error) => showToast(error.message, 'error'))
  );
  query('#refresh-offline-permit').addEventListener('click', () => prepareOfflinePermit());
  query('#history-filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    loadHistory();
  });
  query('#refresh-history').addEventListener('click', loadHistory);
  query('#open-organization-dialog').addEventListener('click', () => openOrganizationDialog());
  query('#submit-organization-form').addEventListener('click', submitOrganizationForm);
  query('#open-employee-import').addEventListener('click', openEmployeeImportDialog);
  query('#submit-employee-import').addEventListener('click', uploadEmployeeWorkbook);
  query('#refresh-organization').addEventListener('click', loadOrganization);
  queryAll('[data-organization-entity]').forEach((button) =>
    button.addEventListener('click', () => {
      state.organizationEntity = button.dataset.organizationEntity;
      queryAll('[data-organization-entity]').forEach((item) =>
        item.classList.toggle('active', item === button)
      );
      loadOrganization();
    })
  );
  query('#report-filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    loadReports();
  });
  queryAll('[data-report-type]').forEach((button) =>
    button.addEventListener('click', () => {
      state.reportType = button.dataset.reportType;
      queryAll('[data-report-type]').forEach((item) =>
        item.classList.toggle('active', item === button)
      );
      loadReports();
    })
  );
  queryAll('[data-report-format]').forEach((button) =>
    button.addEventListener('click', () => downloadReport(button.dataset.reportFormat))
  );
  query('#statistics-filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    loadStatistics();
  });
  query('#refresh-statistics').addEventListener('click', loadStatistics);
  query('#calendar-month').addEventListener('change', loadCalendar);
  query('#open-announcement-dialog').addEventListener('click', openAnnouncementDialog);
  query('#submit-announcement-form').addEventListener('click', createAnnouncement);
  query('#refresh-devices').addEventListener('click', loadDevices);
  query('#settings-company').addEventListener('change', loadCompanySettings);
  query('#company-identity-form').addEventListener('submit', saveCompanyIdentity);
  query('#company-settings-form').addEventListener('submit', saveCompanySettings);
  query('#backup-schedule-form').addEventListener('submit', saveBackupSchedule);
  query('#backup-schedule-form').elements.frequency.addEventListener(
    'change',
    updateBackupFrequencyFields
  );
  queryAll('[data-backup-type]').forEach((button) =>
    button.addEventListener('click', () => startBackup(button.dataset.backupType))
  );
  query('#refresh-audit').addEventListener('click', loadAudit);
  query('#analyze-database').addEventListener('click', analyzeDatabase);
  query('#clean-system-data').addEventListener('click', cleanSystemData);
  query('#refresh-profile').addEventListener('click', loadProfile);
  query('#profile-form').addEventListener('submit', saveProfile);
  query('#profile-password-form').addEventListener('submit', changeOwnPassword);
  query('#notification-button').addEventListener('click', () => {
    const menu = query('#notification-menu');
    menu.hidden = !menu.hidden;
    if (!menu.hidden) loadNotifications();
  });
  query('#mark-notifications-read').addEventListener('click', markAllNotificationsRead);
  query('#open-request-dialog').addEventListener('click', openRequestDialog);
  query('#request-type').addEventListener('change', setRequestFormType);
  query('#submit-request-form').addEventListener('click', submitRequestForm);
  query('#refresh-requests').addEventListener('click', loadRequests);
  query('#refresh-sessions').addEventListener('click', loadSessions);
  query('#close-roster').addEventListener('click', () => {
    query('#roster-panel').hidden = true;
  });
  query('#open-user-dialog').addEventListener('click', openUserDialog);
  query('#submit-user-form').addEventListener('click', createUser);
  query('#save-role-permissions').addEventListener('click', saveRolePermissions);
  query('#nav-toggle').addEventListener('click', () => query('#sidebar').classList.toggle('open'));
  queryAll('.nav-item').forEach((button) =>
    button.addEventListener('click', () => setView(button.dataset.viewTarget))
  );
  queryAll('[data-roster]').forEach((button) =>
    button.addEventListener('click', () => loadRoster(button.dataset.roster))
  );
  query('#app-shell').addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.reviewId) reviewRequest(target);
    if (target.dataset.requestCancelId) cancelRequest(target);
    if (target.dataset.userId) setUserStatus(target);
    if (target.dataset.roleId) selectRole(target.dataset.roleId);
    if (target.dataset.sessionId) revokeSession(target);
    if (target.dataset.notificationId) markNotificationRead(target.dataset.notificationId);
    if (target.dataset.organizationEdit) openOrganizationDialog(target.dataset.organizationEdit);
    if (target.dataset.organizationDelete)
      deleteOrganizationItem(target.dataset.organizationDelete);
    if (target.dataset.siteQr) generateSiteQr(target.dataset.siteQr);
    if (target.dataset.siteQrHistory) loadSiteQrHistory(target.dataset.siteQrHistory);
    if (target.dataset.employeeQr) generateEmployeeQr(target.dataset.employeeQr);
    if (target.dataset.announcementPublish) publishAnnouncement(target.dataset.announcementPublish);
    if (target.dataset.announcementArchive) archiveAnnouncement(target.dataset.announcementArchive);
    if (target.dataset.deviceId)
      setDeviceStatus(target.dataset.deviceId, target.dataset.deviceStatus);
    if (target.dataset.backupRestore) restoreBackup(target.dataset.backupRestore);
    if (target.dataset.ownDeviceDelete) deleteOwnDevice(target.dataset.ownDeviceDelete);
  });
  window.addEventListener('online', () => {
    void synchronizeOfflineQueue();
    if (query('[data-view="attendance"]').classList.contains('active'))
      void prepareOfflinePermit(false);
  });
}

function initialize() {
  setupLogoFallbacks();
  updateClock();
  window.setInterval(updateClock, 15_000);
  bindEvents();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    });
  }
  const saved = getSavedSession();
  if (saved) {
    state.session = saved.data;
    state.storage = saved.storage;
    showApp();
  }
}

initialize();
