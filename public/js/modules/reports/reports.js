import { apiRoot } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { query, escapeHtml } from '../../core/utils.js';
import { api, refreshSession } from '../../core/api.js';
import { showToast, showMessage } from '../../components/toast.js';

export function reportParameters(format) {
  const form = query('#report-filter-form');
  const values = form ? Object.fromEntries(new FormData(form)) : {};
  const parameters = new URLSearchParams({ format });
  if (values.startDate) parameters.set('startDate', values.startDate);
  if (values.endDate) parameters.set('endDate', values.endDate);
  return parameters;
}

export async function loadReports() {
  try {
    const data = await api(`/reports/${state.reportType}?${reportParameters('CSV')}`);
    const head = query('#report-table-head');
    const body = query('#report-table');
    
    if (head) {
      head.innerHTML =
        `<tr>${data.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
    }
    if (body) {
      body.innerHTML = data.rows.length
        ? data.rows
          .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
          .join('')
        : `<tr><td colspan="${data.columns.length}">No hay datos para el período indicado.</td></tr>`;
    }
  } catch (error) {
    showMessage(error.message);
  }
}

export async function downloadReport(format) {
  const parameters = reportParameters(format);
  const request = async () => {
    const response = await fetch(`${apiRoot}/reports/${state.reportType}/export?${parameters}`, {
      headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
    });
    if (response.status === 401 && state.session?.refreshToken) {
      await refreshSession();
      return fetch(`${apiRoot}/reports/${state.reportType}/export?${parameters}`, {
        headers: { authorization: `Bearer ${state.session?.accessToken || ''}` }
      });
    }
    return response;
  };
  try {
    const response = await request();
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || 'No fue posible exportar el reporte');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `msa-${state.reportType.toLowerCase()}.${format.toLowerCase()}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message, 'error');
  }
}
