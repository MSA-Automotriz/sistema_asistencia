import { query, formatDate, escapeHtml } from '../../core/utils.js';

export function renderChart(days) {
  const container = query('#attendance-chart');
  if (!container) return;

  const safeDays = Array.isArray(days) ? days : [];
  const max = Math.max(1, ...safeDays.flatMap((day) => [day.entradas || 0, day.tardanzas || 0]));

  container.innerHTML = safeDays.length
    ? safeDays
      .map((day) => {
        const label = formatDate(`${day.fecha}T12:00:00`, { weekday: 'short' }).replace('.', '');
        const entries = Math.max(3, Math.round(((day.entradas || 0) / max) * 100));
        const late = day.tardanzas ? Math.max(3, Math.round((day.tardanzas / max) * 100)) : 3;
        return `<div class="chart-day"><div class="chart-columns"><span class="chart-bar" style="height:${entries}%"></span><span class="chart-bar late" style="height:${late}%"></span></div><small>${escapeHtml(label)}</small></div>`;
      })
      .join('')
    : '<p class="empty-state">Sin movimientos para el período.</p>';

  // Compute and display weekly summary indicators
  const totalEntries = safeDays.reduce((acc, d) => acc + (d.entradas || 0), 0);
  const totalLate = safeDays.reduce((acc, d) => acc + (d.tardanzas || 0), 0);
  const rate = totalEntries > 0 ? Math.max(0, Math.round(((totalEntries - totalLate) / totalEntries) * 100)) : 100;

  const entriesEl = query('#chart-summary-entries');
  const lateEl = query('#chart-summary-late');
  const rateEl = query('#chart-summary-rate');

  if (entriesEl) entriesEl.textContent = `${totalEntries}`;
  if (lateEl) lateEl.textContent = `${totalLate}`;
  if (rateEl) rateEl.textContent = `${rate}%`;
}

export function renderStatisticsChart(series) {
  const container = query('#statistics-chart');
  if (!container) return;
  const safeSeries = Array.isArray(series) ? series : [];
  const visible = safeSeries.slice(-14);
  const max = Math.max(1, ...visible.flatMap((item) => [item.checkIns || 0, item.late || 0]));
  container.innerHTML = visible.length
    ? visible
      .map((item) => {
        const label = formatDate(`${item.date}T12:00:00`, { weekday: 'short' }).replace('.', '');
        const entries = Math.max(3, Math.round(((item.checkIns || 0) / max) * 100));
        const late = item.late ? Math.max(3, Math.round((item.late / max) * 100)) : 3;
        return `<div class="chart-day"><div class="chart-columns"><span class="chart-bar" style="height:${entries}%"></span><span class="chart-bar late" style="height:${late}%"></span></div><small>${escapeHtml(label)}</small></div>`;
      })
      .join('')
    : '<p class="empty-state">No hay datos estadísticos para el período.</p>';
}
