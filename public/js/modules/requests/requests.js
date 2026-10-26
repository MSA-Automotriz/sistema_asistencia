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
    updateEndpoint: (id) => `/requests/work-permissions/${id}`,
    reviewEndpoint: (id) => `/work-permissions/${id}/review`,
    cancelEndpoint: (id) => `/requests/work-permissions/${id}`
  },
  overtime: {
    resource: 'overtime-requests',
    adminEndpoint: '/requests/admin/overtime?limit=50',
    ownEndpoint: '/requests/overtime',
    updateEndpoint: (id) => `/requests/overtime/${id}`,
    reviewEndpoint: (id) => `/overtime-requests/${id}/review`,
    cancelEndpoint: (id) => `/requests/overtime/${id}`
  },
  vacation: {
    resource: 'vacations',
    adminEndpoint: '/requests/admin/vacations?limit=50',
    ownEndpoint: '/requests/vacations',
    updateEndpoint: (id) => `/requests/vacations/${id}`,
    reviewEndpoint: (id) => `/vacations/${id}/review`,
    cancelEndpoint: (id) => `/requests/vacations/${id}`
  },
  license: {
    resource: 'licenses',
    adminEndpoint: '/requests/admin/licenses?limit=50',
    ownEndpoint: '/requests/licenses',
    updateEndpoint: (id) => `/requests/licenses/${id}`,
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

let requestCache = {
  work: [],
  overtime: [],
  vacation: [],
  license: []
};

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
        const docLink = item.documentUrl
          ? `<a href="${escapeHtml(item.documentUrl)}" target="_blank" rel="noopener noreferrer" class="small-button quiet-button" style="text-decoration: none; padding: 2px 8px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;">Ver sustento</a>`
          : '';
        let actions = '';
        if (item.status === 'PENDING') {
          const editBtn = `<button class="small-button edit-button" data-request-edit-type="${type}" data-request-edit-id="${item.id}" type="button">Editar</button>`;
          if (options.canReview) {
            actions = `<span class="request-actions">${docLink}${editBtn}<button class="small-button approve-button" data-review-type="${type}" data-review-id="${item.id}" data-review-status="APPROVED" type="button">Aprobar</button><button class="small-button reject-button" data-review-type="${type}" data-review-id="${item.id}" data-review-status="REJECTED" type="button">Rechazar</button></span>`;
          } else {
            actions = `<span class="request-actions">${docLink}${editBtn}<button class="small-button reject-button" data-request-cancel-type="${type}" data-request-cancel-id="${item.id}" type="button">Cancelar</button></span>`;
          }
        } else {
          actions = `<span class="request-actions" style="display: inline-flex; align-items: center; gap: 6px;">${docLink}<span class="status-pill ${requestStatusClass(item.status)}">${escapeHtml(item.status)}</span></span>`;
        }
        return `<div class="request-row"><span><strong class="row-name">${escapeHtml(requestDateRange(item, type))}</strong> <small class="row-meta">${escapeHtml([employee, requestDetail(item, type)].filter(Boolean).join(' · '))}</small></span>${actions}</div>`;
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

    requestCache = {
      work: work.items,
      overtime: overtime.items,
      vacation: vacation.items,
      license: license.items
    };
    
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
  const docEl = query('#request-document-field');
  const form = query('#request-form');

  if (startEl) startEl.hidden = isOvertime;
  if (endEl) endEl.hidden = isOvertime;
  if (dateEl) dateEl.hidden = !isOvertime;
  if (minEl) minEl.hidden = !isOvertime;
  if (licEl) licEl.hidden = !isLicense;
  if (docEl) docEl.hidden = isOvertime;
  
  if (form) {
    if (form.elements.startDate) form.elements.startDate.required = !isOvertime;
    if (form.elements.endDate) form.elements.endDate.required = !isOvertime;
    if (form.elements.date) form.elements.date.required = isOvertime;
    if (form.elements.requestedMinutes) form.elements.requestedMinutes.required = isOvertime;
    if (form.elements.licenseType) form.elements.licenseType.required = isLicense;
    if (form.elements.reason) form.elements.reason.required = type === 'WORK_PERMISSION' || isOvertime;
  }
}

function bindDocumentInput() {
  const docInput = query('#request-form-document');
  const docName = query('#request-document-name');
  if (docInput && !docInput.dataset.listenerBound) {
    docInput.dataset.listenerBound = 'true';
    docInput.addEventListener('change', () => {
      const file = docInput.files?.[0];
      if (file && docName) {
        docName.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        docName.style.display = 'block';
      } else if (docName && !query('#request-existing-doc')?.value) {
        docName.style.display = 'none';
      }
    });
  }
}

const toDateInputValue = (d) => {
  if (!d) return '';
  const str = d instanceof Date ? d.toISOString() : String(d);
  return str.slice(0, 10);
};

export function openRequestDialog() {
  const form = query('#request-form');
  if (form) form.reset();
  const editIdInput = query('#request-edit-id');
  if (editIdInput) editIdInput.value = '';
  const existingDocInput = query('#request-existing-doc');
  if (existingDocInput) existingDocInput.value = '';

  const title = query('#request-dialog-title');
  if (title) title.textContent = 'Nueva solicitud';
  const submitBtn = query('#submit-request-form');
  if (submitBtn) submitBtn.textContent = 'Enviar';

  const typeSelect = query('#request-type');
  if (typeSelect) typeSelect.disabled = false;

  const docName = query('#request-document-name');
  if (docName) {
    docName.textContent = '';
    docName.style.display = 'none';
  }
  bindDocumentInput();
  setRequestFormType();
  const dialog = query('#request-dialog');
  if (dialog) dialog.showModal();
}

export function editRequest(button) {
  const type = button.dataset.requestEditType;
  const id = button.dataset.requestEditId;
  const item = requestCache[type]?.find((i) => i.id === id);
  if (!item) return;

  const form = query('#request-form');
  if (!form) return;
  form.reset();

  const editIdInput = query('#request-edit-id');
  if (editIdInput) editIdInput.value = item.id;

  const existingDocInput = query('#request-existing-doc');
  if (existingDocInput) existingDocInput.value = item.documentUrl || '';

  const title = query('#request-dialog-title');
  if (title) title.textContent = 'Editar solicitud';
  const submitBtn = query('#submit-request-form');
  if (submitBtn) submitBtn.textContent = 'Guardar cambios';

  const typeMap = {
    work: 'WORK_PERMISSION',
    overtime: 'OVERTIME',
    vacation: 'VACATION',
    license: 'LICENSE'
  };
  const typeSelect = query('#request-type');
  if (typeSelect) {
    typeSelect.value = typeMap[type] || 'WORK_PERMISSION';
    typeSelect.disabled = true;
  }

  if (form.elements.startDate) form.elements.startDate.value = toDateInputValue(item.startDate);
  if (form.elements.endDate) form.elements.endDate.value = toDateInputValue(item.endDate);
  if (form.elements.date) form.elements.date.value = toDateInputValue(item.date);
  if (form.elements.requestedMinutes) form.elements.requestedMinutes.value = item.requestedMinutes || '';
  if (form.elements.licenseType) form.elements.licenseType.value = item.type || '';
  if (form.elements.reason) form.elements.reason.value = item.reason || '';

  const docName = query('#request-document-name');
  if (docName) {
    if (item.documentUrl) {
      docName.innerHTML = `Sustento actual: <a href="${escapeHtml(item.documentUrl)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">Ver documento</a> (Seleccione otro si desea cambiarlo)`;
      docName.style.display = 'block';
    } else {
      docName.textContent = '';
      docName.style.display = 'none';
    }
  }

  bindDocumentInput();
  setRequestFormType();
  const dialog = query('#request-dialog');
  if (dialog) dialog.showModal();
}

export async function submitRequestForm() {
  const form = query('#request-form');
  if (!form || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const editId = form.querySelector('#request-edit-id')?.value;
  const existingDoc = form.querySelector('#request-existing-doc')?.value;
  const typeSelect = query('#request-type');
  const requestType = values.requestType || typeSelect?.value || 'WORK_PERMISSION';

  const button = query('#submit-request-form');
  button.disabled = true;

  try {
    let documentUrl = existingDoc || null;
    const docInput = form.querySelector('#request-form-document');
    const file = docInput?.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('El archivo de sustento no debe superar los 5MB.', 'warning');
        button.disabled = false;
        return;
      }
      const uploadData = new FormData();
      uploadData.append('document', file);
      const uploaded = await api('/requests/upload', {
        method: 'POST',
        body: uploadData
      });
      documentUrl = uploaded?.url || null;
    }

    const typeKeyMap = {
      WORK_PERMISSION: 'work',
      OVERTIME: 'overtime',
      VACATION: 'vacation',
      LICENSE: 'license'
    };
    const key = typeKeyMap[requestType];
    const definition = requestDefinitions[key];

    const bodyByType = {
      WORK_PERMISSION: {
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
        documentUrl
      },
      OVERTIME: {
        date: values.date,
        requestedMinutes: Number(values.requestedMinutes),
        reason: values.reason
      },
      VACATION: {
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined
      },
      LICENSE: {
        startDate: values.startDate,
        endDate: values.endDate,
        type: values.licenseType,
        reason: values.reason || undefined,
        documentUrl
      }
    };
    const body = bodyByType[requestType];

    if (editId) {
      await api(definition.updateEndpoint(editId), {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      showToast('Solicitud actualizada correctamente');
    } else {
      await api(definition.ownEndpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      showToast('Solicitud enviada correctamente');
    }

    const dialog = query('#request-dialog');
    if (dialog) dialog.close();
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
