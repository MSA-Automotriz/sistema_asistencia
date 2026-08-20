import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';

const companySettingsSchema = z.object({
  body: z
    .object({
      settings: z
        .array(
          z
            .object({ key: z.string().trim().min(1).max(191), value: z.string().max(10_000) })
            .strict()
        )
        .min(1)
        .max(100)
    })
    .strict()
});

const companyIdentitySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(191).optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().trim().max(100).nullable().optional(),
      address: z.string().trim().max(500).nullable().optional(),
      timeZone: z.string().trim().min(1).max(100).optional(),
      logoUrl: z.string().url().max(500).nullable().optional()
    })
    .strict()
    .refine(
      (input) => Object.values(input).some((value) => value !== undefined),
      'Debe indicar un campo para actualizar'
    )
});

export const companiesRouter = Router();

companiesRouter.get(
  '/companies/:companyId/settings',
  authorize('settings.read'),
  async (request, response) => {
    const settings = await prisma.setting.findMany({
      where: { companyId: String(request.params.companyId) },
      orderBy: { key: 'asc' }
    });
    return ok(response, 'Configuración obtenida correctamente', settings);
  }
);

companiesRouter.put(
  '/companies/:companyId/settings',
  authorize('settings.update'),
  validate(companySettingsSchema),
  async (request, response) => {
    const companyId = String(request.params.companyId);
    await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { id: true } });
    await prisma.$transaction(
      request.body.settings.map((setting: { key: string; value: string }) =>
        prisma.setting.upsert({
          where: { companyId_key: { companyId, key: setting.key } },
          create: { companyId, key: setting.key, value: setting.value },
          update: { value: setting.value }
        })
      )
    );
    auditEvent(request, 'UPDATE', 'CompanySettings', companyId);
    return ok(response, 'Configuración actualizada correctamente');
  }
);

companiesRouter.patch(
  '/companies/:companyId/identity',
  authorize('companies.update'),
  validate(companyIdentitySchema),
  async (request, response) => {
    const company = await prisma.company.update({
      where: { id: String(request.params.companyId) },
      data: request.body
    });
    auditEvent(request, 'UPDATE', 'Company', company.id);
    return ok(response, 'Identidad de empresa actualizada correctamente', company);
  }
);
