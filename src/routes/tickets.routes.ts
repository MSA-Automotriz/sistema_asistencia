import { Router } from 'express';
import { z } from 'zod';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { SupportTicketService } from '../use-cases/tickets/ticket-service.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../common/http/response.js';
import { auditEvent } from './helpers.js';

const tickets = new SupportTicketService();

const createTicketSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(150),
      category: z.nativeEnum(TicketCategory),
      priority: z.nativeEnum(TicketPriority),
      description: z.string().trim().min(5).max(3000),
      siteId: z.string().min(1).nullable().optional()
    })
    .strict()
});

const updateTicketStatusSchema = z.object({
  body: z
    .object({
      status: z.nativeEnum(TicketStatus),
      resolutionNote: z.string().trim().max(3000).nullable().optional(),
      assignedToId: z.string().min(1).nullable().optional()
    })
    .strict()
});

const ticketQuerySchema = z.object({
  status: z.preprocess((val) => (val === '' ? undefined : val), z.nativeEnum(TicketStatus).optional()),
  category: z.preprocess((val) => (val === '' ? undefined : val), z.nativeEnum(TicketCategory).optional()),
  priority: z.preprocess((val) => (val === '' ? undefined : val), z.nativeEnum(TicketPriority).optional()),
  siteId: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  search: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  scope: z.preprocess((val) => (val === '' ? undefined : val), z.enum(['own', 'all']).optional()),
  page: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().int().positive().optional()),
  limit: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().int().positive().max(100).optional())
});

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

ticketsRouter.post(
  '/tickets',
  validate(createTicketSchema),
  async (request, response) => {
    const ticket = await tickets.createTicket(request.auth!.sub, request.body);
    auditEvent(request, 'CREATE', 'SupportTicket', ticket.id);
    return ok(response, 'Ticket creado exitosamente', ticket, 201);
  }
);

ticketsRouter.get('/tickets', async (request, response) => {
  const query = ticketQuerySchema.parse(request.query);
  const result = await tickets.listTickets(request.auth!, query);
  return ok(response, 'Tickets obtenidos correctamente', result.items);
});


ticketsRouter.get('/tickets/:id', async (request, response) => {
  const ticket = await tickets.getTicketById(request.auth!, String(request.params.id));
  return ok(response, 'Ticket obtenido correctamente', ticket);
});

ticketsRouter.patch(
  '/tickets/:id/status',
  validate(updateTicketStatusSchema),
  async (request, response) => {
    const updated = await tickets.updateTicketStatus(
      request.auth!,
      String(request.params.id),
      request.body
    );
    auditEvent(request, 'RESOLVE', 'SupportTicket', updated.id);
    return ok(response, 'Estado del ticket actualizado', updated);
  }
);

ticketsRouter.patch('/tickets/:id/cancel', async (request, response) => {
  const cancelled = await tickets.cancelTicket(request.auth!, String(request.params.id));
  auditEvent(request, 'CANCEL', 'SupportTicket', cancelled.id);
  return ok(response, 'Ticket cancelado correctamente', cancelled);
});

ticketsRouter.delete('/tickets/:id', async (request, response) => {
  const cancelled = await tickets.cancelTicket(request.auth!, String(request.params.id));
  auditEvent(request, 'CANCEL', 'SupportTicket', cancelled.id);
  return ok(response, 'Ticket cancelado correctamente', cancelled);
});

