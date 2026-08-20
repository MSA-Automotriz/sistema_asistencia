import { Router } from 'express';
import { z } from 'zod';
import { ReportService, reportTypes } from '../use-cases/reports/report-service.js';
import { authorize } from '../middleware/auth.js';
import { ok } from '../common/http/response.js';

const reports = new ReportService();

const reportQuerySchema = z
  .object({
    format: z.enum(['CSV', 'XLSX', 'PDF']).default('CSV'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    companyId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    employeeId: z.string().min(1).optional()
  })
  .strict();

export const reportsRouter = Router();

reportsRouter.get('/reports/:type/export', authorize('reports.read'), async (request, response) => {
  const type = z.enum(reportTypes).parse(request.params.type);
  const query = reportQuerySchema.parse(request.query);
  const exported = await reports.export(type, query.format, query);
  response.setHeader('content-type', exported.contentType);
  response.setHeader(
    'content-disposition',
    `attachment; filename="msa-${type.toLowerCase()}.${exported.extension}"`
  );
  return response.status(200).send(exported.content);
});

reportsRouter.get('/reports/:type', authorize('reports.read'), async (request, response) => {
  const type = z.enum(reportTypes).parse(request.params.type);
  const query = reportQuerySchema.parse(request.query);
  return ok(response, 'Reporte obtenido correctamente', await reports.buildTable(type, query));
});
