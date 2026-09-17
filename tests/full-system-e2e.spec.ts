import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('Comprehensive System-Wide End-to-End Verification', () => {
  let adminToken: string;

  it('1. Authentication & Security Session Initialization', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@msaautomotriz.com',
        password: 'ChangeMe123!',
        rememberMe: true
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;
  });

  describe('2. Self-Service API Operations (/api/v1/me/*)', () => {
    it('verifies /me/profile with sites array and company data', async () => {
      const res = await request(app)
        .get('/api/v1/me/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(Array.isArray(res.body.data.sites)).toBe(true);
    });

    it('verifies /me/notifications', async () => {
      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('verifies /me/devices', async () => {
      const res = await request(app)
        .get('/api/v1/me/devices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('verifies /me/requests', async () => {
      const res = await request(app)
        .get('/api/v1/me/requests')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('verifies /me/last-attendance', async () => {
      const res = await request(app)
        .get('/api/v1/me/last-attendance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('3. Attendance & Operational Services', () => {
    it('verifies /attendance/history with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/history?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('verifies /attendance/statistics', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/statistics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.totals).toBeDefined();
    });

    it('verifies /attendance/calendar', async () => {
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/v1/attendance/calendar?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });

    it('verifies /attendance/offline-permit generation', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/offline-permit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
    });
  });

  describe('4. Master Data & Administrative Entities', () => {
    const endpoints = [
      '/api/v1/dashboard/summary',
      '/api/v1/users',
      '/api/v1/roles',
      '/api/v1/permissions',
      '/api/v1/companies',
      '/api/v1/sites',
      '/api/v1/departments',
      '/api/v1/positions',
      '/api/v1/schedules',
      '/api/v1/employees',
      '/api/v1/announcements',
      '/api/v1/devices',
      '/api/v1/system/status',
      '/api/v1/audit-logs'
    ];

    for (const endpoint of endpoints) {
      it(`verifies ${endpoint} responds with 200 OK`, async () => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    }
  });

  describe('5. Reporting & Business Analytics Engine', () => {
    it('verifies /reports/ATTENDANCE table data query', async () => {
      const res = await request(app)
        .get('/api/v1/reports/ATTENDANCE')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toBeDefined();
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });

    it('verifies /reports/ATTENDANCE/export CSV file export', async () => {
      const res = await request(app)
        .get('/api/v1/reports/ATTENDANCE/export?format=CSV')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('verifies /reports/LATE_ARRIVALS table data query', async () => {
      const res = await request(app)
        .get('/api/v1/reports/LATE_ARRIVALS')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toBeDefined();
    });
  });
});
