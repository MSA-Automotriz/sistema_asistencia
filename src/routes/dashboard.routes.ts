import { Router } from 'express';
import { DashboardService } from '../use-cases/dashboard/dashboard-service.js';
import { authorize } from '../middleware/auth.js';
import { ok } from '../common/http/response.js';

const dashboard = new DashboardService();

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard/summary', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Resumen del dashboard obtenido', await dashboard.summary())
);

dashboardRouter.get('/dashboard/present', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Personal presente obtenido correctamente', await dashboard.presentEmployees())
);

dashboardRouter.get('/dashboard/absent', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Personal ausente obtenido correctamente', await dashboard.absentEmployees())
);

dashboardRouter.get('/dashboard/late', authorize('dashboard.read'), async (_request, response) =>
  ok(response, 'Tardanzas obtenidas correctamente', await dashboard.lateArrivals())
);

dashboardRouter.get(
  '/dashboard/recent-activity',
  authorize('dashboard.read'),
  async (_request, response) =>
    ok(response, 'Actividad reciente obtenida correctamente', await dashboard.recentActivity())
);
