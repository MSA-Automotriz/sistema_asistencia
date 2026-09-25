import { state } from '../../core/state.js';
import { query, escapeHtml } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { prepareOfflinePermit } from './offline-sync.js';

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function setGeofenceMapState(label, className = 'status-pending') {
  const element = query('#geofence-map-state');
  if (!element) return;
  element.textContent = label;
  element.className = `status-pill ${className}`;
}

export function clearGeofenceLayers() {
  if (!state.geofenceMap) return;
  if (state.geofenceSiteLayers?.length) {
    state.geofenceSiteLayers.forEach(({ marker, circle }) => {
      if (marker) state.geofenceMap.removeLayer(marker);
      if (circle) state.geofenceMap.removeLayer(circle);
    });
    state.geofenceSiteLayers = [];
  }
  ['geofenceSiteMarker', 'geofenceCircle', 'geofenceLocationMarker'].forEach((key) => {
    if (state[key]) state.geofenceMap.removeLayer(state[key]);
    state[key] = null;
  });
}

export function renderGeofenceMap(sitesData) {
  const leaflet = window.L;
  if (!leaflet) {
    setGeofenceMapState('Mapa no disponible', 'status-inactive');
    return;
  }

  const rawList = Array.isArray(sitesData) ? sitesData : sitesData ? [sitesData] : [];
  const validSites = rawList
    .map((s) => ({
      id: s.id,
      name: s.name || 'Sede',
      address: s.address || '',
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      radiusMeters: Number(s.radiusMeters) || 30
    }))
    .filter(
      (s) =>
        Number.isFinite(s.latitude) &&
        Number.isFinite(s.longitude) &&
        Number.isFinite(s.radiusMeters)
    );

  state.activeGeofenceSites = validSites;

  if (validSites.length === 0) {
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
      .tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution:
          'Tiles &copy; Esri',
        maxZoom: 19
      })
      .addTo(state.geofenceMap);
  } catch (err) {
    console.error('Error al inicializar Leaflet:', err);
    setGeofenceMapState('Error de inicialización', 'status-inactive');
    return;
  }

  try {
    clearGeofenceLayers();
    state.geofenceSiteLayers = [];

    const bounds = leaflet.latLngBounds([]);

    validSites.forEach((site) => {
      const center = [site.latitude, site.longitude];
      bounds.extend(center);

      const marker = leaflet
        .circleMarker(center, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#e30613',
          fillOpacity: 1
        })
        .bindPopup(
          `<strong>Sede autorizada: ${escapeHtml(site.name)}</strong><br><small>${escapeHtml(site.address)}</small><br><small>Radio: ${site.radiusMeters} m</small>`
        )
        .addTo(state.geofenceMap);

      const circle = leaflet
        .circle(center, {
          radius: Math.max(10, site.radiusMeters),
          color: '#e30613',
          fillColor: '#e30613',
          fillOpacity: 0.18,
          weight: 2
        })
        .addTo(state.geofenceMap);

      state.geofenceSiteLayers.push({ site, marker, circle });
    });

    if (validSites.length === 1) {
      state.geofenceMap.setView([validSites[0].latitude, validSites[0].longitude], 16);
    } else {
      state.geofenceMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    if (state.attendanceLocation) {
      renderGeofenceLocation(state.attendanceLocation);
    } else {
      const count = validSites.length;
      setGeofenceMapState(
        count === 1
          ? `Sede: ${validSites[0].name} (${validSites[0].radiusMeters}m)`
          : `${count} sedes autorizadas`,
        'status-active'
      );
    }

    setTimeout(() => state.geofenceMap?.invalidateSize(), 100);
    setTimeout(() => state.geofenceMap?.invalidateSize(), 500);
  } catch (err) {
    console.error('Error al renderizar geocercas en mapa:', err);
  }
}

export function renderGeofenceLocation(location) {
  const leaflet = window.L;
  if (!leaflet || !state.geofenceMap || !location) return;

  if (state.geofenceLocationMarker) {
    state.geofenceMap.removeLayer(state.geofenceLocationMarker);
  }

  const userLat = location.latitude;
  const userLng = location.longitude;

  state.geofenceLocationMarker = leaflet
    .circleMarker([userLat, userLng], {
      radius: 7,
      color: '#1d4ed8',
      fillColor: '#3b82f6',
      fillOpacity: 0.95,
      weight: 2
    })
    .bindPopup('<strong>Tu ubicación actual</strong>')
    .addTo(state.geofenceMap);

  const sites = state.activeGeofenceSites || [];
  if (sites.length === 0) return;

  const evaluated = sites.map((site) => {
    const dist = calculateDistanceMeters(userLat, userLng, site.latitude, site.longitude);
    return {
      site,
      distanceMeters: dist,
      isInside: dist <= site.radiusMeters
    };
  });

  evaluated.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const matched = evaluated.find((e) => e.isInside);

  if (matched) {
    setGeofenceMapState(
      `Sede detectada: ${matched.site.name} (${Math.round(matched.distanceMeters)}m)`,
      'status-active'
    );
  } else {
    const nearest = evaluated[0];
    const nearestDist = Math.round(nearest.distanceMeters);
    setGeofenceMapState(
      `Fuera de sede (${nearest.site.name} a ${nearestDist}m)`,
      'status-pending'
    );
  }
}

export async function loadAttendanceMap() {
  setGeofenceMapState('Cargando mapa...', 'status-pending');
  let sitesToRender = null;
  try {
    const profile = await api('/me/profile');
    state.profile = profile;
    sitesToRender = profile?.sites?.length ? profile.sites : profile?.site ? [profile.site] : null;
  } catch (error) {
    console.warn('Error al obtener perfil en vivo:', error);
  }

  if (!sitesToRender || sitesToRender.length === 0) {
    sitesToRender = state.profile?.sites?.length
      ? state.profile.sites
      : state.profile?.site
        ? [state.profile.site]
        : [
            {
              name: 'MSA Automotriz',
              latitude: -7.144582,
              longitude: -78.512535,
              radiusMeters: 30
            }
          ];
  }

  renderGeofenceMap(sitesToRender);
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
