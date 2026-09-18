import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';

describe('Support Tickets Module (Helpdesk TI)', () => {
  let adminToken: string;
  let adminUser: any;
  let employeeToken: string;
  let employeeUser: any;
  let createdTicketId: string;
  let createdTicketNumber: string;

  beforeAll(async () => {
    // 1. Login as Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@msaautomotriz.com',
        password: 'ChangeMe123!',
        rememberMe: true
      });

    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;
    adminUser = adminLogin.body.data.user;

    // 2. Find or prepare a regular employee for testing privacy boundaries
    let regularUser = await prisma.user.findFirst({
      where: {
        email: { not: 'admin@msaautomotriz.com' },
        status: 'ACTIVE',
        role: { name: 'Empleado' }
      }
    });

    if (!regularUser) {
      // Find any non-admin user
      regularUser = await prisma.user.findFirst({
        where: {
          email: { not: 'admin@msaautomotriz.com' },
          status: 'ACTIVE'
        }
      });
    }

    if (regularUser) {
      // Update password to known test password if needed or login
      await prisma.user.update({
        where: { id: regularUser.id },
        data: {
          // bcrypt hash of 'ChangeMe123!'
          passwordHash: '$2a$10$8sL4s6x2K1qCgZlY/i9jPeRj6bKqv3S8R9Z.iAke1uXm4N8h0fCqa'
        }
      });

      const empLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: regularUser.email,
          password: 'ChangeMe123!',
          rememberMe: true
        });

      if (empLogin.status === 200) {
        employeeToken = empLogin.body.data.accessToken;
        employeeUser = empLogin.body.data.user;
      }
    }
  });

  it('1. Rejects ticket creation with missing required fields (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '',
        category: 'HARDWARE'
        // missing priority and description
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('2. Creates a support ticket with auto-generated ticket number', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Impresora térmica de recepción sin conexión a red',
        category: 'PRINTER',
        priority: 'HIGH',
        description: 'La impresora EPSON TM-T20 no responde al envío de tickets desde la estación de recepción.'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(res.body.data.title).toBe('Impresora térmica de recepción sin conexión a red');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.category).toBe('PRINTER');
    expect(res.body.data.priority).toBe('HIGH');

    createdTicketId = res.body.data.id;
    createdTicketNumber = res.body.data.ticketNumber;
  });

  it('3. Retrieves ticket list with filtering and search', async () => {
    const res = await request(app)
      .get('/api/v1/tickets?category=PRINTER&status=PENDING&search=EPSON')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const match = res.body.data.find((t: any) => t.id === createdTicketId);
    expect(match).toBeDefined();
    expect(match.ticketNumber).toBe(createdTicketNumber);
  });

  it('4. Updates ticket status to IN_PROGRESS and then RESOLVED with technical note', async () => {
    // Step A: Set to IN_PROGRESS
    const progressRes = await request(app)
      .patch(`/api/v1/tickets/${createdTicketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'IN_PROGRESS',
        resolutionNote: 'Se inicia diagnóstico de IP y cableado de red.'
      });

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.success).toBe(true);
    expect(progressRes.body.data.status).toBe('IN_PROGRESS');

    // Step B: Set to RESOLVED
    const resolveRes = await request(app)
      .patch(`/api/v1/tickets/${createdTicketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Se reconfiguró la dirección IP estática en el router y se verificó prueba de impresión.'
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
    expect(resolveRes.body.data.resolvedAt).toBeDefined();
    expect(resolveRes.body.data.resolvedById).toBe(adminUser.id);
  });


  it('5. Retrieves ticket details by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdTicketId);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolutionNote).toContain('Se reconfiguró la dirección IP');
  });

  it('6. Allows ticket creator to cancel a pending ticket', async () => {
    // Create a temporary ticket
    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ticket de prueba para cancelación',
        category: 'OTHER',
        priority: 'LOW',
        description: 'Este ticket será cancelado inmediatamente.'
      });

    expect(createRes.status).toBe(201);
    const tempTicketId = createRes.body.data.id;

    // Cancel it
    const cancelRes = await request(app)
      .patch(`/api/v1/tickets/${tempTicketId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('CLOSED');
  });
});
