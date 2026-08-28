import { query, formatDate, escapeHtml } from '../../core/utils.js';

export function renderChart(days) {
  const container = query('#attendance-chart');
  if (!container) return;
  const max = Math.max(1, ...days.flatMap((day) => [day.entradas || 0, day.tardanzas || 0]));
  container.innerHTML = days.length
    ? days
      .map((day) => {
        const label = formatDate(`${day.fecha}T12:00:00`, { weekday: 'short' }).replace('.', '');
        const entries = Math.max(3, Math.round(((day.entradas || 0) / max) * 100));
        const late = day.tardanzas ? Math.max(3, Math.round((day.tardanzas / max) * 100)) : 3;
        return `<div class="chart-day"><div class="chart-columns"><span class="chart-bar" style="height:${entries}%"></span><span class="chart-bar late" style="height:${late}%"></span></div><small>${escapeHtml(label)}</small></div>`;
      })
      .join('')
    : '<p class="empty-state">Sin movimientos para el período.</p>';
}

export function renderStatisticsChart(series) {
  const container = query('#statistics-chart');
  if (!container) return;
  const visible = series.slice(-14);
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
