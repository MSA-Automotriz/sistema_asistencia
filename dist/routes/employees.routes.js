import { Router } from 'express';
import { z } from 'zod';
import { EmployeeAdministrationService } from '../use-cases/employees/employee-administration-service.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { AppError } from '../common/errors/app-error.js';
import { auditEvent, upload } from './helpers.js';
const employees = new EmployeeAdministrationService();
const employeeProvisionSchema = z.object({
    body: z
        .object({
        userId: z.string().min(1),
        companyId: z.string().min(1),
        employeeCode: z.string().trim().min(1).max(100),
        siteId: z.string().min(1).nullable().optional(),
        departmentId: z.string().min(1).nullable().optional(),
        positionId: z.string().min(1).nullable().optional(),
        scheduleId: z.string().min(1).nullable().optional(),
        supervisorId: z.string().min(1).nullable().optional(),
        profilePhotoUrl: z.string().url().max(500).nullable().optional(),
        hiredAt: z.coerce.date(),
        birthDate: z.coerce.date().nullable().optional(),
        active: z.boolean().optional()
    })
        .strict()
});
const employeeUpdateSchema = z.object({
    body: employeeProvisionSchema.shape.body
        .omit({ userId: true })
        .partial()
        .strict()
        .refine((input) => Object.values(input).some((value) => value !== undefined), 'Debe indicar un campo para actualizar')
});
export const employeesRouter = Router();
employeesRouter.post('/employees/provision', authorize('employees.create'), validate(employeeProvisionSchema), async (request, response) => {
    const employee = await employees.create(request.body);
    auditEvent(request, 'CREATE', 'Employee', employee.id);
    return ok(response, 'Empleado registrado correctamente', employee, 201);
});
employeesRouter.put('/employees/:id/assignments', authorize('employees.update'), validate(employeeUpdateSchema), async (request, response) => {
    const employee = await employees.update(String(request.params.id), request.body);
    auditEvent(request, 'UPDATE', 'Employee', employee.id);
    return ok(response, 'Empleado actualizado correctamente', employee);
});
employeesRouter.patch('/employees/:id/assignments', authorize('employees.update'), validate(employeeUpdateSchema), async (request, response) => {
    const employee = await employees.update(String(request.params.id), request.body);
    auditEvent(request, 'UPDATE', 'Employee', employee.id);
    return ok(response, 'Empleado actualizado correctamente', employee);
});
employeesRouter.post('/employees/import', authorize('imports.create'), upload.single('file'), async (request, response) => {
    if (!request.file?.buffer)
        throw new AppError(422, 'Debe adjuntar un archivo Excel .xlsx');
    if (!request.file.originalname.toLowerCase().endsWith('.xlsx'))
        throw new AppError(422, 'El archivo debe tener extensión .xlsx');
    const result = await employees.importWorkbook(request.file.buffer);
    auditEvent(request, 'IMPORT', 'Employee');
    return ok(response, 'Importación de empleados procesada correctamente', result, 201);
});
//# sourceMappingURL=employees.routes.js.map