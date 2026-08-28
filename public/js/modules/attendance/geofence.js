import { state } from '../../core/state.js';
import { query, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { prepareOfflinePermit } from './offline-sync.js';

export function setGeofenceMapState(label, className = 'status-pending') {
  const element = query('#geofence-map-state');
  if (!element) return;
  element.textContent = label;
  element.className = `status-pill ${className}`;
}

export function clearGeofenceLayers() {
  if (!state.geofenceMap) return;
  ['geofenceSiteMarker', 'geofenceCircle', 'geofenceLocationMarker'].forEach((key) => {
    if (state[key]) state.geofenceMap.removeLayer(state[key]);
    state[key] = null;
  });
}

export function renderGeofenceMap(site) {
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
  const container = query('#geofence-map');
  if (!container) return;

  if (state.geofenceMap) {
    try {
      state.geofenceMap.remove();
    } catch {
      // Ignorar error al limpiar mapa previo
    }
    state.geofenceMap = null;
  }

  if (container._leaflet_id) {
    try {
      delete container._leaflet_id;
    } catch {
      container._leaflet_id = null;
    }
  }
  container.innerHTML = '';

  try {
    state.geofenceMap = leaflet.map(container, {
      scrollWheelZoom: false,
      preferCanvas: true
    });
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      })
      .addTo(state.geofenceMap);
  } catch (err) {
    console.error('Error al inicializar Leaflet:', err);
    setGeofenceMapState('Error de inicialización', 'status-inactive');
    return;
  }

  try {
    clearGeofenceLayers();
    const center = [latitude, longitude];
    state.geofenceMap.setView(center, 16);

    state.geofenceSiteMarker = leaflet
      .circleMarker(center, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#e30613',
        fillOpacity: 1
      })
      .bindPopup(
        `<strong>Sede autorizada: ${escapeHtml(site.name || 'Sin nombre')}</strong><br><small>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>`
      )
      .addTo(state.geofenceMap);

    state.geofenceCircle = leaflet
      .circle(center, {
        radius: Math.max(10, radiusMeters),
        color: '#e30613',
        fillColor: '#e30613',
        fillOpacity: 0.18,
        weight: 2
      })
      .addTo(state.geofenceMap);

    if (state.attendanceLocation) renderGeofenceLocation(state.attendanceLocation);
    setGeofenceMapState(`Sede: ${site.name || 'Autorizada'} (${radiusMeters}m)`, 'status-active');
    setTimeout(() => state.geofenceMap?.invalidateSize(), 100);
    setTimeout(() => state.geofenceMap?.invalidateSize(), 500);
  } catch (err) {
    console.error('Error al renderizar geocerca en mapa:', err);
  }
}

export function renderGeofenceLocation(location) {
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

export async function loadAttendanceMap() {
  setGeofenceMapState('Cargando mapa...', 'status-pending');
  let siteToRender = null;
  try {
    const profile = await api('/me/profile');
    state.profile = profile;
    siteToRender = profile?.site;
  } catch (error) {
    console.warn('Error al obtener perfil en vivo:', error);
  }

  if (!siteToRender) {
    siteToRender = state.profile?.site || {
      name: 'MSA Automotriz',
      latitude: -7.144582,
      longitude: -78.512535,
      radiusMeters: 30
    };
  }

  renderGeofenceMap(siteToRender);
  void prepareOfflinePermit(false);
}

export async function captureLocation() {
  if (!navigator.geolocation) throw new Error('El navegador no permite obtener ubicación');
  const locState = query('#attendance-location-state');
  if (locState) {
    locState.textContent = 'Buscando GPS';
    locState.className = 'status-pill status-pending';
  }
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0
    });
  });
  state.attendanceLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  renderGeofenceLocation(state.attendanceLocation);
  const coordsEl = query('#attendance-coordinates');
  if (coordsEl) {
    coordsEl.textContent = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
  }
  if (locState) {
    locState.textContent = 'GPS listo';
    locState.className = 'status-pill status-active';
  }
  return state.attendanceLocation;
}
