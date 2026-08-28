import { state } from '../../core/state.js';
import { query, fullName, escapeHtml, hasPermission } from '../../core/utils.js';
import { api } from '../../core/api.js';
import { showToast, showMessage } from '../../components/toast.js';
import { organizationDefinitions } from './definitions.js';

export async function loadOrganizationReferences() {
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

export function referenceLabel(source, item) {
  if (source === 'users') return `${fullName(item)} (${item.email})`;
  if (source === 'employees') return item.employeeCode;
  return item.name || item.employeeCode || item.id;
}

export function organizationFieldMarkup(field, item) {
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

export async function openOrganizationDialog(editingId = null) {
  const config = organizationDefinitions[state.organizationEntity];
  try {
    await loadOrganizationReferences();
    state.organizationEditingId = editingId;
    const item = state.organizationItems.find((candidate) => candidate.id === editingId);
    const titleEl = query('#organization-dialog-title');
    const fieldsEl = query('#organization-form-fields');
    const dialogEl = query('#organization-dialog');
    
    if (titleEl) titleEl.textContent = `${editingId ? 'Editar' : 'Crear'} ${config.label.slice(0, -1)}`;
    if (fieldsEl) {
      fieldsEl.innerHTML = config.fields
        .filter((field) => !(editingId && field.createOnly))
        .map((field) => organizationFieldMarkup(field, item))
        .join('');
    }
    if (dialogEl) dialogEl.showModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

export function organizationPayload() {
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

export async function submitOrganizationForm() {
  const form = query('#organization-form');
  if (!form || !form.reportValidity()) return;
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
    const dialog = query('#organization-dialog');
    if (dialog) dialog.close();
    showToast('Registro guardado correctamente');
    loadOrganization();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export function renderOrganization(items) {
  const config = organizationDefinitions[state.organizationEntity];
  const titleEl = query('#organization-title');
  const importBtn = query('#open-employee-import');
  const headEl = query('#organization-table-head');
  const bodyEl = query('#organization-table');

  if (titleEl) titleEl.textContent = config.label;
  if (importBtn) {
    importBtn.hidden =
      state.organizationEntity !== 'employees' || !hasPermission('imports.create');
  }
  if (headEl) {
    headEl.innerHTML =
      `<tr>${config.columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}<th></th></tr>`;
  }
  if (bodyEl) {
    bodyEl.innerHTML = items.length
      ? items
        .map((item) => {
          const actions = [
            `<button class="small-button" data-organization-edit="${item.id}" type="button">Editar</button>`,
            `<button class="small-button reject-button" data-organization-delete="${item.id}" type="button">Eliminar</button>`
          ];
          return `<tr>${config.columns.map(([, getter]) => `<td>${escapeHtml(getter(item))}</td>`).join('')}<td><span class="table-actions">${actions.join('')}</span></td></tr>`;
        })
        .join('')
      : `<tr><td colspan="${config.columns.length + 1}">No hay registros para mostrar.</td></tr>`;
  }
}

export async function loadOrganization() {
  try {
    const config = organizationDefinitions[state.organizationEntity];
    const data = await api(`${config.endpoint}?limit=100`);
    state.organizationItems = data.items || [];
    renderOrganization(state.organizationItems);
  } catch (error) {
    showMessage(error.message);
  }
}

export async function deleteOrganizationItem(itemId) {
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
