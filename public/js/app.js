/**
 * MSA Asistencia - Frontend Entry Point
 * Arquitectura modular ES Modules con Delegación Global de Eventos
 */

import { state } from './core/state.js';
import { query, queryAll } from './core/utils.js';
import {
  getSavedSession,
  login,
  signOut,
  showApp,
  showRecovery,
  showLoginForm,
  startRecovery,
  resetPassword
} from './core/auth.js';
import { setView } from './core/router.js';
import { loadModals } from './core/view-loader.js';
import { showToast } from './components/toast.js';
import { updateClock } from './components/clock.js';
import { initTheme, toggleTheme } from './components/theme.js';

// Módulos funcionales
import {
  submitAttendance,
  loadHistory
} from './modules/attendance/attendance.js';
import { captureLocation } from './modules/attendance/geofence.js';
import {
  prepareOfflinePermit,
  synchronizeOfflineQueue
} from './modules/attendance/offline-sync.js';
import {
  loadDashboard,
  loadStatistics
} from './modules/dashboard/dashboard.js';
import {
  loadCalendar,
  selectCalendarDay,
  handleCategoryFilter,
  handleCalendarSearch,
  changeCalendarMonth,
  resetCalendarToToday,
  clearCalendarDaySelection
} from './modules/calendar/calendar.js';
import { loadRoster } from './modules/dashboard/activity.js';
import {
  loadRequests,
  openRequestDialog,
  setRequestFormType,
  submitRequestForm,
  reviewRequest,
  cancelRequest
} from './modules/requests/requests.js';
import {
  loadOrganization,
  openOrganizationDialog,
  submitOrganizationForm,
  deleteOrganizationItem,
  handleOrganizationSearch
} from './modules/organization/organization.js';
import {
  openEmployeeImportDialog,
  uploadEmployeeWorkbook
} from './modules/organization/employee-import.js';
import {
  openUserDialog,
  createUser,
  openEditUserDialog,
  updateUser,
  deleteUser,
  setUserStatus,
  downloadUsersPdf
} from './modules/users/users.js';
import {
  openRoleDialog,
  createRole,
  selectRole,
  saveRolePermissions
} from './modules/users/roles.js';
import {
  loadSessions,
  revokeSession
} from './modules/users/sessions.js';
import {
  openAnnouncementDialog,
  createAnnouncement,
  publishAnnouncement,
  archiveAnnouncement
} from './modules/announcements/announcements.js';
import {
  loadDevices,
  setDeviceStatus
} from './modules/devices/devices.js';
import {
  loadReports,
  downloadReport
} from './modules/reports/reports.js';
import {
  loadCompanySettings,
  saveCompanyIdentity,
  saveCompanySettings,
  startBackup,
  saveBackupSchedule,
  restoreBackup,
  loadAudit,
  analyzeDatabase,
  cleanSystemData,
  updateBackupFrequencyFields,
  handleAuditFilter,
  handleLogKindChange,
  copySystemLogs
} from './modules/audit/audit.js';
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updatePushStatusUI,
  togglePushSubscription,
  sendTestPushNotification
} from './modules/notifications/notifications.js';
import {
  loadProfile,
  saveProfile,
  changeOwnPassword,
  saveOwnRecoveryQuestions,
  deleteOwnDevice
} from './modules/profile/profile.js';

function setupLogoFallbacks() {
  [
    ['#brand-logo', '#brand-fallback'],
    ['#sidebar-logo', '#sidebar-fallback']
  ].forEach(([imageSelector, fallbackSelector]) => {
    const image = query(imageSelector);
    const fallback = query(fallbackSelector);
    if (!image || !fallback) return;
    const showFallback = () => {
      image.hidden = true;
      fallback.hidden = false;
    };
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && !image.naturalWidth) showFallback();
  });
}

function isInstalledApp() {
  return (
    state.appInstalled ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function updateInstallButtons() {
  const hidden = isInstalledApp();
  queryAll('[data-install-app]').forEach((button) => {
    button.hidden = hidden;
    button.disabled = hidden;
  });
}

async function installApp() {
  const prompt = state.installPrompt;
  if (!prompt) {
    showToast('Use la opción Instalar aplicación del menú de su navegador.');
    return;
  }
  prompt.prompt();
  const choice = await prompt.userChoice;
  state.installPrompt = null;
  if (choice.outcome === 'accepted') state.appInstalled = true;
  updateInstallButtons();
  if (choice.outcome === 'accepted') showToast('Aplicación instalada correctamente');
}

function setupAppInstallation() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    updateInstallButtons();
  });
  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    state.appInstalled = true;
    updateInstallButtons();
    showToast('Aplicación instalada correctamente');
  });
  updateInstallButtons();
}

/**
 * Delegación Global de Eventos (Captura eventos en cualquier vista o modal dinámico)
 */
function bindGlobalEvents() {
  // 1. Envío de Formularios (submit)
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form) return;

    if (form.id === 'login-form') {
      login(event);
    } else if (form.id === 'recovery-start-form') {
      startRecovery(event);
    } else if (form.id === 'recovery-reset-form') {
      resetPassword(event);
    } else if (form.id === 'attendance-form') {
      submitAttendance(event);
    } else if (form.id === 'history-filter-form') {
      event.preventDefault();
      loadHistory();
    } else if (form.id === 'report-filter-form') {
      event.preventDefault();
      loadReports();
    } else if (form.id === 'statistics-filter-form') {
      event.preventDefault();
      loadStatistics();
    } else if (form.id === 'company-identity-form') {
      saveCompanyIdentity(event);
    } else if (form.id === 'company-settings-form') {
      saveCompanySettings(event);
    } else if (form.id === 'backup-schedule-form') {
      saveBackupSchedule(event);
    } else if (form.id === 'profile-form') {
      saveProfile(event);
    } else if (form.id === 'profile-password-form') {
      changeOwnPassword(event);
    } else if (form.id === 'profile-recovery-form') {
      saveOwnRecoveryQuestions(event);
    }
  });

  // 2. Clics e Interacciones de Botones (click)
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target) return;

    // Navegación de vistas
    const viewButton = target.closest('[data-view-target]');
    if (viewButton) {
      setView(viewButton.dataset.viewTarget);
      return;
    }

    // Instalación PWA
    if (target.closest('[data-install-app]')) {
      void installApp();
      return;
    }

    // Retorno al login
    if (target.closest('[data-back-to-login]')) {
      showLoginForm();
      return;
    }

    // Botones con ID específicos
    const button = target.closest('button, a');
    if (!button) return;

    const id = button.id;
    if (id === 'show-recovery') {
      showRecovery();
    } else if (id === 'logout-button') {
      signOut();
    } else if (id === 'nav-toggle') {
      query('#sidebar')?.classList.toggle('open');
    } else if (id === 'theme-toggle-button') {
      toggleTheme();
    } else if (id === 'refresh-dashboard') {
      loadDashboard();
    } else if (id === 'quick-create-announcement') {
      openAnnouncementDialog();
    } else if (id === 'quick-go-attendance') {
      setView('attendance');
    } else if (id === 'quick-go-requests') {
      setView('requests');
    } else if (id === 'capture-location') {
      captureLocation().catch((error) => showToast(error.message, 'error'));
    } else if (id === 'refresh-offline-permit') {
      prepareOfflinePermit();
    } else if (id === 'refresh-history') {
      loadHistory();
    } else if (id === 'open-organization-dialog') {
      openOrganizationDialog();
    } else if (id === 'submit-organization-form') {
      submitOrganizationForm();
    } else if (id === 'open-employee-import') {
      openEmployeeImportDialog();
    } else if (id === 'submit-employee-import') {
      uploadEmployeeWorkbook();
    } else if (id === 'refresh-organization') {
      loadOrganization();
    } else if (id === 'clear-organization-search' || id === 'clear-search-link') {
      const searchInput = query('#organization-search');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      handleOrganizationSearch('');
    } else if (id === 'refresh-statistics') {
      loadStatistics();
    } else if (id === 'open-announcement-dialog') {
      openAnnouncementDialog();
    } else if (id === 'submit-announcement-form') {
      createAnnouncement();
    } else if (id === 'refresh-devices') {
      loadDevices();
    } else if (id === 'refresh-audit') {
      loadAudit();
    } else if (id === 'analyze-database') {
      analyzeDatabase();
    } else if (id === 'clean-system-data') {
      cleanSystemData();
    } else if (id === 'copy-logs-btn') {
      copySystemLogs();
    } else if (id === 'refresh-profile') {
      loadProfile();
    } else if (id === 'notification-button') {
      const menu = query('#notification-menu');
      if (menu) {
        menu.hidden = !menu.hidden;
        if (!menu.hidden) {
          loadNotifications();
          void updatePushStatusUI();
        }
      }
    } else if (id === 'mark-notifications-read') {
      markAllNotificationsRead();
    } else if (id === 'push-toggle-btn' || id === 'profile-push-toggle') {
      togglePushSubscription();
    } else if (id === 'profile-push-test') {
      sendTestPushNotification();
    } else if (id === 'open-request-dialog') {
      openRequestDialog();
    } else if (id === 'submit-request-form') {
      submitRequestForm();
    } else if (id === 'refresh-requests') {
      loadRequests();
    } else if (id === 'refresh-sessions') {
      loadSessions();
    } else if (id === 'close-roster') {
      const roster = query('#roster-panel');
      if (roster) roster.hidden = true;
    } else if (id === 'download-users-pdf') {
      downloadUsersPdf();
    } else if (id === 'open-user-dialog') {
      openUserDialog();
    } else if (id === 'submit-user-form') {
      createUser();
    } else if (id === 'submit-edit-user-form') {
      updateUser();
    } else if (id === 'open-role-dialog') {
      openRoleDialog();
    } else if (id === 'submit-role-form') {
      createRole();
    } else if (id === 'save-role-permissions') {
      saveRolePermissions();
    } else if (id === 'select-all-permissions') {
      queryAll('#permissions-list input[type="checkbox"]').forEach((cb) => (cb.checked = true));
    } else if (id === 'unselect-all-permissions') {
      queryAll('#permissions-list input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    }

    // Pestañas y Data attributes
    if (button.dataset.organizationEntity) {
      state.organizationEntity = button.dataset.organizationEntity;
      queryAll('[data-organization-entity]').forEach((item) =>
        item.classList.toggle('active', item === button)
      );
      const searchInput = query('#organization-search');
      if (searchInput) {
        searchInput.value = '';
      }
      state.organizationSearchTerm = '';
      const clearBtn = query('#clear-organization-search');
      if (clearBtn) clearBtn.hidden = true;
      loadOrganization();
      return;
    }

    if (button.dataset.reportType) {
      state.reportType = button.dataset.reportType;
      queryAll('[data-report-type]').forEach((item) =>
        item.classList.toggle('active', item === button)
      );
      loadReports();
      return;
    }

    if (button.dataset.reportFormat) {
      downloadReport(button.dataset.reportFormat);
      return;
    }

    if (button.dataset.backupType) {
      startBackup(button.dataset.backupType);
      return;
    }

    if (button.dataset.roster) {
      loadRoster(button.dataset.roster);
      return;
    }

    // Acciones dinámicas de filas y tablas
    if (button.dataset.reviewId) reviewRequest(button);
    if (button.dataset.requestCancelId) cancelRequest(button);
    if (button.dataset.editUserId) openEditUserDialog(button.dataset.editUserId);
    if (button.dataset.userId) setUserStatus(button);
    if (button.dataset.deleteUserId) deleteUser(button);
    if (button.dataset.roleId) selectRole(button.dataset.roleId);
    if (button.dataset.sessionId) revokeSession(button);
    if (button.dataset.notificationId) markNotificationRead(button.dataset.notificationId);
    if (button.dataset.organizationEdit) openOrganizationDialog(button.dataset.organizationEdit);
    if (button.dataset.organizationDelete)
      deleteOrganizationItem(button.dataset.organizationDelete);
    if (button.dataset.announcementPublish) publishAnnouncement(button.dataset.announcementPublish);
    if (button.dataset.announcementArchive) archiveAnnouncement(button.dataset.announcementArchive);
    if (button.dataset.deviceId)
      setDeviceStatus(button.dataset.deviceId, button.dataset.deviceStatus);
    if (button.dataset.backupRestore) restoreBackup(button.dataset.backupRestore);
    if (button.dataset.ownDeviceDelete) deleteOwnDevice(button.dataset.ownDeviceDelete);
    if (button.dataset.logKind) handleLogKindChange(button.dataset.logKind);
    if (button.id === 'calendar-prev-month') changeCalendarMonth(-1);
    if (button.id === 'calendar-next-month') changeCalendarMonth(1);
    if (button.id === 'calendar-today-btn') resetCalendarToToday();
    if (button.id === 'day-drawer-close') clearCalendarDaySelection();
    if (button.dataset.category && button.closest('#calendar-category-filters')) {
      handleCategoryFilter(button.dataset.category);
    }

    const dayCell = event.target.closest('.cal-day-cell');
    if (dayCell && dayCell.dataset.calendarDate) {
      selectCalendarDay(dayCell.dataset.calendarDate);
    }
  });

  // 3. Cambios en selects / inputs (change)
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!target) return;

    if (target.id === 'calendar-month') {
      loadCalendar();
    } else if (target.id === 'settings-company') {
      loadCompanySettings();
    } else if (target.id === 'request-type') {
      setRequestFormType();
    } else if (target.name === 'frequency' && target.closest('#backup-schedule-form')) {
      updateBackupFrequencyFields();
    }
  });

  // 4. Búsqueda y filtrado en tiempo real (input)
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target && target.id === 'organization-search') {
      handleOrganizationSearch(target.value);
    } else if (target && target.id === 'audit-filter-input') {
      handleAuditFilter(target.value);
    } else if (target && target.id === 'calendar-search') {
      handleCalendarSearch(target.value);
    }
  });

  window.addEventListener('online', () => {
    void synchronizeOfflineQueue();
    if (query('[data-view="attendance"]')?.classList.contains('active'))
      void prepareOfflinePermit(false);
  });
}

async function initialize() {
  initTheme();
  setupLogoFallbacks();
  setupAppInstallation();
  updateClock();
  window.setInterval(updateClock, 15_000);
  bindGlobalEvents();

  // Escucha directa en el formulario de login y recuperación
  query('#login-form')?.addEventListener('submit', login);
  query('#recovery-start-form')?.addEventListener('submit', startRecovery);
  query('#recovery-reset-form')?.addEventListener('submit', resetPassword);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICKED') {
        void loadNotifications();
      }
    });
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/service-worker.js').then((reg) => {
        void reg.update();
        void updatePushStatusUI();
      }).catch(() => undefined);
    });
  }

  // Pre-cargar modales y vistas en segundo plano para fluidez total
  await loadModals();

  const saved = getSavedSession();
  if (saved) {
    state.session = saved.data;
    state.storage = saved.storage;
    await showApp();
    void updatePushStatusUI();
  }
}

// Iniciar aplicación
initialize();
