import { sessionKey } from './constants.js';
import { state } from './state.js';
import { query, queryAll, fullName, escapeHtml } from './utils.js';
import { rawRequest } from './api.js';
import { showToast, clearMessage } from '../components/toast.js';
import { renderSidebarNavigation, setView } from './router.js';
import { loadModals, preloadAllViews } from './view-loader.js';
import { loadNotifications } from '../modules/notifications/notifications.js';
import { registerKnownDevice } from '../modules/attendance/attendance.js';
import { synchronizeOfflineQueue } from '../modules/attendance/offline-sync.js';
import { updatePushStatusUI } from '../modules/notifications/notifications.js';

export function getSavedSession() {
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

export function saveSession(session, rememberMe) {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  state.storage = rememberMe ? localStorage : sessionStorage;
  state.storage.setItem(sessionKey, JSON.stringify({ ...session, rememberMe }));
  state.session = { ...session, rememberMe };
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  state.session = null;
  state.storage = null;
}

export function updateAccount() {
  const user = state.session?.user;
  if (!user) return;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const nameEl = query('#account-name');
  const roleEl = query('#account-role');
  const initialsEl = query('#account-initials');
  if (nameEl) nameEl.textContent = fullName(user);
  if (roleEl) roleEl.textContent = user.role || 'Usuario';
  if (initialsEl) initialsEl.textContent = initials || 'MS';
  renderSidebarNavigation();
}

export async function showApp() {
  const authScreen = query('#auth-screen');
  const appShell = query('#app-shell');
  if (authScreen) authScreen.hidden = true;
  if (appShell) appShell.hidden = false;
  updateAccount();

  try {
    await setView('dashboard');
  } catch (error) {
    console.error('Error loading dashboard view:', error);
  }

  void loadModals();
  void loadNotifications();
  void registerKnownDevice();
  void synchronizeOfflineQueue();
  void preloadAllViews();
}

export function showLogin() {
  const appShell = query('#app-shell');
  const authScreen = query('#auth-screen');
  const loginCard = query('#login-card');
  const recoveryCard = query('#recovery-card');
  const loginForm = query('#login-form');
  const alertEl = query('#login-error-alert');
  if (alertEl) {
    alertEl.hidden = true;
    alertEl.textContent = '';
  }
  if (appShell) appShell.hidden = true;
  if (authScreen) authScreen.hidden = false;
  if (loginCard) loginCard.hidden = false;
  if (recoveryCard) recoveryCard.hidden = true;
  if (loginForm) loginForm.reset();
}

export async function login(event) {
  if (event) event.preventDefault();
  const alertEl = query('#login-error-alert');
  if (alertEl) {
    alertEl.hidden = true;
    alertEl.textContent = '';
  }

  const emailInput = query('#login-email');
  const passwordInput = query('#login-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const rememberMe = query('#remember-me')?.checked || false;
  const button = query('#login-form button[type="submit"]');
  const originalText = button ? button.textContent : 'Entrar';

  if (!email || !password) {
    if (alertEl) {
      alertEl.textContent = 'Por favor ingrese su usuario y contraseña.';
      alertEl.hidden = false;
    }
    showToast('Ingrese su usuario y contraseña', 'error');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Verificando...';
  }

  try {
    const data = await rawRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    saveSession(data, rememberMe);
    clearMessage();
    if (alertEl) alertEl.hidden = true;
    await showApp();
  } catch (error) {
    if (alertEl) {
      alertEl.textContent = error.message || 'Error al iniciar sesión';
      alertEl.hidden = false;
    }
    showToast(error.message, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

export async function signOut(notify = true) {
  const refreshToken = state.session?.refreshToken;
  if (refreshToken) {
    try {
      await rawRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    } catch {
      /* Session must still be cleared locally */
    }
  }
  clearSession();
  showLogin();
  if (notify) showToast('Sesión cerrada correctamente');
}

export function showRecovery() {
  const loginCard = query('#login-card');
  const recoveryCard = query('#recovery-card');
  const startForm = query('#recovery-start-form');
  const resetForm = query('#recovery-reset-form');
  if (loginCard) loginCard.hidden = true;
  if (recoveryCard) recoveryCard.hidden = false;
  if (startForm) startForm.hidden = false;
  if (resetForm) resetForm.hidden = true;
}

export function showLoginForm() {
  state.recovery = null;
  const loginCard = query('#login-card');
  const recoveryCard = query('#recovery-card');
  const startForm = query('#recovery-start-form');
  const resetForm = query('#recovery-reset-form');
  if (recoveryCard) recoveryCard.hidden = true;
  if (loginCard) loginCard.hidden = false;
  if (startForm) {
    startForm.hidden = false;
    startForm.reset();
  }
  if (resetForm) {
    resetForm.hidden = true;
    resetForm.reset();
  }
}

export async function startRecovery(event) {
  if (event) event.preventDefault();
  const alertEl = query('#recovery-error-alert');
  if (alertEl) {
    alertEl.hidden = true;
    alertEl.textContent = '';
  }
  const email = query('#recovery-email')?.value.trim();
  if (!email) {
    if (alertEl) {
      alertEl.textContent = 'Ingrese su ID de usuario o correo.';
      alertEl.hidden = false;
    }
    showToast('Ingrese su ID de usuario o correo', 'error');
    return;
  }
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
    if (alertEl) {
      alertEl.textContent = error.message || 'Error en recuperación';
      alertEl.hidden = false;
    }
    showToast(error.message, 'error');
  }
}

export async function resetPassword(event) {
  if (event) event.preventDefault();
  if (!state.recovery) return;
  const alertEl = query('#recovery-error-alert');
  const answers = queryAll('#recovery-questions input').map((input) => ({
    questionId: input.dataset.questionId,
    answer: input.value.trim()
  }));
  const newPassword = query('#recovery-password')?.value;
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
    if (alertEl) {
      alertEl.textContent = error.message || 'Error al restablecer contraseña';
      alertEl.hidden = false;
    }
    showToast(error.message, 'error');
  }
}

// Global session listeners
window.addEventListener('session-refreshed', () => {
  updateAccount();
});
window.addEventListener('session-expired', () => {
  void signOut(false);
});

// Expose globally on window for robust direct binding and inline event compatibility
if (typeof window !== 'undefined') {
  window.login = login;
  window.showRecovery = showRecovery;
  window.showLoginForm = showLoginForm;
  window.startRecovery = startRecovery;
  window.resetPassword = resetPassword;
  window.signOut = signOut;
}
