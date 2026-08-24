import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { rolesRouter } from './roles.routes.js';
import { requestsRouter } from './requests.routes.js';
import { meRouter } from './me.routes.js';
import { attendanceRouter } from './attendance.routes.js';
import { reportsRouter } from './reports.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { employeesRouter } from './employees.routes.js';
import { devicesRouter } from './devices.routes.js';
import { announcementsRouter } from './announcements.routes.js';
import { auditRouter } from './audit.routes.js';
import { companiesRouter } from './companies.routes.js';
import { backupsRouter } from './backups.routes.js';
import { systemRouter } from './system.routes.js';
import { crudRouter } from './crud.routes.js';
import { pushRouter } from './push.routes.js';

export const apiRouter = Router();

// Rutas públicas y de autenticación base
apiRouter.use(authRouter);
apiRouter.use(pushRouter);


// Middleware global de autenticación para todas las operaciones internas
apiRouter.use(authenticate);

// Módulos funcionales
apiRouter.use(usersRouter);
apiRouter.use(rolesRouter);
apiRouter.use(requestsRouter);
apiRouter.use(meRouter);
apiRouter.use(attendanceRouter);
apiRouter.use(reportsRouter);
apiRouter.use(dashboardRouter);
apiRouter.use(employeesRouter);
apiRouter.use(devicesRouter);
apiRouter.use(announcementsRouter);
apiRouter.use(auditRouter);
apiRouter.use(companiesRouter);
apiRouter.use(backupsRouter);
apiRouter.use(systemRouter);
apiRouter.use(crudRouter);
