import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('End-to-End Login to Main Dashboard Flow', () => {
  let accessToken: string;

  it('1. Successfully logs in with admin credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@msaautomotriz.com',
        password: 'ChangeMe123!',
        rememberMe: true
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('admin@msaautomotriz.com');
    expect(response.body.data.user.role).toBe('Administrador');
    expect(Array.isArray(response.body.data.user.permissions)).toBe(true);
    expect(response.body.data.user.permissions).toContain('dashboard.read');

    accessToken = response.body.data.accessToken;
  });

  it('2. Loads dashboard summary metrics with the authenticated token', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.resumenGeneral).toBeDefined();
    expect(response.body.data.personalPresente).toBeDefined();
    expect(response.body.data.personalAusente).toBeDefined();
    expect(response.body.data.tardanzas).toBeDefined();
  });

  it('3. Loads user profile with the authenticated token', async () => {
    const response = await request(app)
      .get('/api/v1/me/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('admin@msaautomotriz.com');
  });

  it('4. Loads user notifications with the authenticated token', async () => {
    const response = await request(app)
      .get('/api/v1/me/notifications?limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });

  it('5. Serves the dashboard HTML view containing all panel elements', async () => {
    const response = await request(app).get('/views/dashboard/dashboard.html');
    expect(response.status).toBe(200);
    expect(response.text).toContain('id="admin-dashboard-view"');
    expect(response.text).toContain('id="employee-dashboard-view"');
    expect(response.text).toContain('id="metric-present"');
    expect(response.text).toContain('id="metric-absent"');
    expect(response.text).toContain('id="metric-late"');
    expect(response.text).toContain('id="attendance-chart"');
    expect(response.text).toContain('id="activity-list"');
  });

  it('6. Serves all modal dialogs ready for dynamic injection', async () => {
    const modalFiles = [
      '/views/modals/user-dialog.html',
      '/views/modals/edit-user-dialog.html',
      '/views/modals/role-dialog.html',
      '/views/modals/organization-dialog.html',
      '/views/modals/employee-import-dialog.html',
      '/views/modals/announcement-dialog.html',
      '/views/modals/request-dialog.html'
    ];

    for (const modal of modalFiles) {
      const response = await request(app).get(modal);
      expect(response.status).toBe(200);
      expect(response.text).toContain('<dialog');
      expect(response.text).toContain('</dialog>');
    }
  });
});
