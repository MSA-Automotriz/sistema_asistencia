// Detectar automáticamente la URL de la API según el entorno de ejecución
export const apiRoot = (() => {
  if (typeof window === 'undefined') return '/api/v1';
  // Si estamos directamente en el servidor Node en el puerto 3000
  if (window.location.port === '3000') return '/api/v1';
  // Si estamos abriendo a través de Apache / XAMPP (puerto 80 o diferente a 3000)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:3000/api/v1`;
  }
  return '/api/v1';
})();

export const sessionKey = 'msa-asistencia-session';
export const deviceFingerprintKey = 'msa-asistencia-device-fingerprint';
export const offlinePermitKey = 'msa-asistencia-offline-permit';
export const offlineQueueKey = 'msa-asistencia-offline-queue';
export const themeStorageKey = 'msa-theme';
