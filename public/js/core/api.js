import { apiRoot, sessionKey } from './constants.js';
import { state } from './state.js';

export async function rawRequest(path, options = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'No fue posible completar la operación');
  return payload?.data;
}

export async function refreshSession() {
  if (!state.session?.refreshToken) throw new Error('La sesión venció');
  const data = await rawRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: state.session.refreshToken })
  });
  
  // Persist updated session
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  const rememberMe = state.session.rememberMe;
  state.storage = rememberMe ? localStorage : sessionStorage;
  state.storage.setItem(sessionKey, JSON.stringify({ ...data, rememberMe }));
  state.session = { ...data, rememberMe };
  
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('session-refreshed', { detail: state.session }));
  return state.session;
}

export async function api(path, options = {}, retry = true) {
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
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }
    throw error;
  }
}
