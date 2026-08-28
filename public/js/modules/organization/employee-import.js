import { apiRoot } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { query } from '../../core/utils.js';
import { refreshSession } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { loadOrganization } from './organization.js';

export function openEmployeeImportDialog() {
  const form = query('#employee-import-form');
  const result = query('#employee-import-result');
  const dialog = query('#employee-import-dialog');
  if (form) form.reset();
  if (result) result.hidden = true;
  if (dialog) dialog.showModal();
}

export async function uploadEmployeeWorkbook() {
  const form = query('#employee-import-form');
  if (!form || !form.reportValidity()) return;
  const file = form.elements.file?.files?.[0];
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
    if (result && summary) {
      result.textContent = `${summary.created.length} de ${summary.total} empleados importados.${summary.errors.length ? ` ${summary.errors.length} filas con errores.` : ''}`;
      result.hidden = false;
    }
    showToast('Importación procesada correctamente');
    loadOrganization();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}
