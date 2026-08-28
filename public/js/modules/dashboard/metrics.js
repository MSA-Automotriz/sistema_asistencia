import { query } from '../../core/utils.js';
import { renderChart } from './charts.js';
import { renderActivity } from './activity.js';

export function renderDashboard(summary) {
  const safe = summary || {};
  const kpi = safe.indicadoresKpi || {};
  const dateEl = query('#dashboard-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date());
  }
  
  const setContent = (selector, val) => {
    const el = query(selector);
    if (el) el.textContent = val;
  };
  
  setContent('#metric-present', safe.personalPresente ?? 0);
  setContent('#metric-attendance', `${kpi.tasaAsistencia ?? 0}% de asistencia`);
  setContent('#metric-absent', safe.personalAusente ?? 0);
  setContent('#metric-late', safe.tardanzas ?? 0);
  setContent('#metric-hours', `${safe.horasTrabajadas ?? 0} h`);
  setContent('#metric-average-hours', `${kpi.horasPromedioPorEmpleado ?? 0} h por persona`);
  setContent('#metric-overtime', `${safe.horasExtrasAprobadas ?? 0} h`);
  setContent('#metric-permissions', safe.permisosPendientes ?? 0);
  
  renderChart(safe.graficos?.asistenciaUltimosSieteDias || []);
  renderActivity(safe.actividadReciente || []);
}
