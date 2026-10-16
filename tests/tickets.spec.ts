import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app.js';

describe('Support Tickets Module (Helpdesk TI)', () => {
  let adminToken: string;
  let adminUser: { id: string; email: string };
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

    const match = res.body.data.find((t: { id: string; ticketNumber: string }) => t.id === createdTicketId);
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

  it('7. Handles photo evidence upload for tickets', async () => {
    // 1. Rejects invalid file types (e.g. text file pretending to be image or plain text)
    const badUpload = await request(app)
      .post('/api/v1/tickets/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('evidence', Buffer.from('console.log("not an image")'), 'script.js');

    expect(badUpload.status).toBe(400);

    // 2. Accepts valid image file (PNG buffer)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);

    const goodUpload = await request(app)
      .post('/api/v1/tickets/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('evidence', pngBuffer, 'error-screenshot.png');

    expect(goodUpload.status).toBe(201);
    expect(goodUpload.body.success).toBe(true);
    expect(goodUpload.body.data.url).toMatch(/^\/uploads\/tickets\/ticket-.*\.png$/);

    const uploadedUrl = goodUpload.body.data.url;

    // 3. Creates ticket with evidenceUrl
    const ticketWithEvidence = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Error visual en pantalla azul',
        category: 'HARDWARE',
        priority: 'MEDIUM',
        description: 'Adjunto captura de la pantalla con el código de error visual.',
        evidenceUrl: uploadedUrl
      });

    expect(ticketWithEvidence.status).toBe(201);
    expect(ticketWithEvidence.body.data.evidenceUrl).toBe(uploadedUrl);
  });

  it('8. Handles document / proof upload (PDF or image) for permissions requests', async () => {
    // 1. Accepts valid PDF buffer
    const pdfBuffer = Buffer.from('%PDF-1.4 sample pdf content');

    const pdfUpload = await request(app)
      .post('/api/v1/requests/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('document', pdfBuffer, 'certificado_medico.pdf');

    expect(pdfUpload.status).toBe(201);
    expect(pdfUpload.body.success).toBe(true);
    expect(pdfUpload.body.data.url).toMatch(/^\/uploads\/requests\/request-.*\.pdf$/);

    const docUrl = pdfUpload.body.data.url;

    // 2. Creates work permission with documentUrl
    const permRes = await request(app)
      .post('/api/v1/requests/work-permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startDate: '2026-11-10T08:00:00.000Z',
        endDate: '2026-11-10T17:00:00.000Z',
        reason: 'Cita médica programada con certificado adjunto',
        documentUrl: docUrl
      });

    expect(permRes.status).toBe(201);
    expect(permRes.body.data.documentUrl).toBe(docUrl);
  });
});

