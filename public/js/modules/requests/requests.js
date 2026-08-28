import { state } from '../../core/state.js';
import { query, fullName, formatDate, escapeHtml, hasPermission } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage, clearMessage } from '../../components/toast.js';
import { loadProfile } from '../profile/profile.js';

export const requestDefinitions = {
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

export function requestStatusClass(status) {
  return (
    {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      CANCELLED: 'status-inactive'
    }[status] || 'status-inactive'
  );
}

export function requestDateRange(item, type) {
  if (type === 'overtime') return formatDate(item.date);
  return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
}

export function requestDetail(item, type) {
  if (type === 'overtime') return `${item.requestedMinutes} min · ${item.reason}`;
  if (type === 'license') return `${item.type} · ${item.reason || 'Sin detalle'}`;
  return item.reason || 'Sin detalle';
}

export function renderRequests(items, target, type, options) {
  const container = query(target);
  if (!container) return;
  container.innerHTML = items.length
    ? items
      .map((item) => {
        const employee =
          options.canReview && item.employee?.user
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

export async function loadRequestCollection(type) {
  const definition = requestDefinitions[type];
  const user = state.session?.user;
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name || '';
  const canReview = roleName !== 'Empleado' && hasPermission(`${definition.resource}.update`);
  if (canReview) {
    const data = await api(definition.adminEndpoint);
    return {
      items: Array.isArray(data) ? data : data.items || [],
      canReview: true,
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

export async function loadRequests() {
  try {
    clearMessage();
    const user = state.session?.user;
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name || '';
    const hasAdminReview =
      roleName !== 'Empleado' &&
      (hasPermission('work-permissions.update') ||
        hasPermission('overtime-requests.update') ||
        hasPermission('vacations.update') ||
        hasPermission('licenses.update'));

    const eyebrow = query('#requests-view-eyebrow');
    const title = query('#requests-view-title');
    if (eyebrow) eyebrow.textContent = hasAdminReview ? 'Administración' : 'Mis trámites';
    if (title) title.textContent = hasAdminReview ? 'Gestión de Solicitudes' : 'Mis Solicitudes';

    const [work, overtime, vacation, license] = await Promise.all([
      loadRequestCollection('work'),
      loadRequestCollection('overtime'),
      loadRequestCollection('vacation'),
      loadRequestCollection('license')
    ]);
    
    const setBadge = (id, count) => {
      const el = query(id);
      if (el) el.textContent = count;
    };
    
    setBadge('#work-request-count', work.items.filter((item) => item.status === 'PENDING').length);
    setBadge('#overtime-request-count', overtime.items.filter((item) => item.status === 'PENDING').length);
    setBadge('#vacation-request-count', vacation.items.filter((item) => item.status === 'PENDING').length);
    setBadge('#license-request-count', license.items.filter((item) => item.status === 'PENDING').length);
    
    renderRequests(work.items, '#work-request-list', 'work', work);
    renderRequests(overtime.items, '#overtime-request-list', 'overtime', overtime);
    renderRequests(vacation.items, '#vacation-request-list', 'vacation', vacation);
    renderRequests(license.items, '#license-request-list', 'license', license);
  } catch (error) {
    showMessage(error.message);
  }
}

export async function reviewRequest(button) {
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

export function setRequestFormType() {
  const type = query('#request-type').value;
  const isOvertime = type === 'OVERTIME';
  const isLicense = type === 'LICENSE';
  const startEl = query('#request-start-date-field');
  const endEl = query('#request-end-date-field');
  const dateEl = query('#request-date-field');
  const minEl = query('#request-minutes-field');
  const licEl = query('#request-license-type-field');
  const form = query('#request-form');

  if (startEl) startEl.hidden = isOvertime;
  if (endEl) endEl.hidden = isOvertime;
  if (dateEl) dateEl.hidden = !isOvertime;
  if (minEl) minEl.hidden = !isOvertime;
  if (licEl) licEl.hidden = !isLicense;
  
  if (form) {
    if (form.elements.startDate) form.elements.startDate.required = !isOvertime;
    if (form.elements.endDate) form.elements.endDate.required = !isOvertime;
    if (form.elements.date) form.elements.date.required = isOvertime;
    if (form.elements.requestedMinutes) form.elements.requestedMinutes.required = isOvertime;
    if (form.elements.licenseType) form.elements.licenseType.required = isLicense;
    if (form.elements.reason) form.elements.reason.required = type === 'WORK_PERMISSION' || isOvertime;
  }
}

export function openRequestDialog() {
  const form = query('#request-form');
  if (form) form.reset();
  setRequestFormType();
  const dialog = query('#request-dialog');
  if (dialog) dialog.showModal();
}

export async function submitRequestForm() {
  const form = query('#request-form');
  if (!form || !form.reportValidity()) return;
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
    const dialog = query('#request-dialog');
    if (dialog) dialog.close();
    showToast('Solicitud enviada correctamente');
    loadRequests();
    if (state.profile) loadProfile();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export async function cancelRequest(button) {
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
