import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('System-wide Route & Asset Verification Scanner', () => {
  describe('1. Static Assets & Modular HTML/CSS/JS Files', () => {
    const staticFiles = [
      '/',
      '/index.html',
      '/app.css',
      '/css/base/variables.css',
      '/css/base/reset.css',
      '/css/base/layout.css',
      '/css/components/buttons.css',
      '/css/components/forms.css',
      '/css/components/tables.css',
      '/css/components/cards.css',
      '/css/components/dialogs.css',
      '/css/components/notifications.css',
      '/css/components/badges.css',
      '/css/views/auth.css',
      '/css/views/dashboard.css',
      '/css/views/attendance.css',
      '/css/views/organization.css',
      '/css/views/requests.css',
      '/css/views/reports.css',
      '/css/views/profile.css',
      '/css/views/users.css',
      '/css/views/audit.css',
      '/css/views/tickets.css',
      '/manifest.webmanifest',
      '/service-worker.js',
      '/views/dashboard/dashboard.html',
      '/views/attendance/attendance.html',
      '/views/history/history.html',
      '/views/requests/requests.html',
      '/views/organization/organization.html',
      '/views/reports/reports.html',
      '/views/statistics/statistics.html',
      '/views/calendar/calendar.html',
      '/views/announcements/announcements.html',
      '/views/devices/devices.html',
      '/views/settings/settings.html',
      '/views/audit/audit.html',
      '/views/profile/profile.html',
      '/views/users/users.html',
      '/views/roles/roles.html',
      '/views/sessions/sessions.html',
      '/views/tickets/tickets.html',
      '/views/modals/user-dialog.html',
      '/views/modals/edit-user-dialog.html',
      '/views/modals/role-dialog.html',
      '/views/modals/organization-dialog.html',
      '/views/modals/employee-import-dialog.html',
      '/views/modals/announcement-dialog.html',
      '/views/modals/request-dialog.html',
      '/views/modals/ticket-dialog.html',
      '/views/modals/resolve-ticket-dialog.html',
      '/js/app.js',
      '/js/core/constants.js',
      '/js/core/state.js',
      '/js/core/utils.js',
      '/js/core/api.js',
      '/js/core/auth.js',
      '/js/modules/tickets/tickets.js',
      '/js/core/router.js',
      '/js/core/view-loader.js',
      '/js/components/toast.js',
      '/js/components/clock.js',
      '/js/components/theme.js',
      '/js/modules/attendance/attendance.js',
      '/js/modules/attendance/geofence.js',
      '/js/modules/attendance/offline-sync.js',
      '/js/modules/dashboard/dashboard.js',
      '/js/modules/dashboard/metrics.js',
      '/js/modules/dashboard/charts.js',
      '/js/modules/dashboard/activity.js',
      '/js/modules/requests/requests.js',
      '/js/modules/organization/definitions.js',
      '/js/modules/organization/organization.js',
      '/js/modules/organization/employee-import.js',
      '/js/modules/users/users.js',
      '/js/modules/users/roles.js',
      '/js/modules/users/sessions.js',
      '/js/modules/devices/devices.js',
      '/js/modules/announcements/announcements.js',
      '/js/modules/reports/reports.js',
      '/js/modules/audit/audit.js',
      '/js/modules/notifications/notifications.js',
      '/js/modules/profile/profile.js'
    ];

    for (const file of staticFiles) {
      it(`serves static asset ${file} with HTTP 200`, async () => {
        const response = await request(app).get(file);
        expect(response.status).toBe(200);
        expect(response.text.length).toBeGreaterThan(0);
      });
    }
  });

  describe('2. SPA Frontend Client Routes Fallback', () => {
    const spaRoutes = [
      '/dashboard',
      '/attendance',
      '/history',
      '/requests',
      '/organization',
      '/reports',
      '/statistics',
      '/calendar',
      '/announcements',
      '/devices',
      '/settings',
      '/audit',
      '/profile',
      '/users',
      '/roles',
      '/sessions'
    ];

    for (const route of spaRoutes) {
      it(`serves index.html for SPA route ${route}`, async () => {
        const response = await request(app).get(route);
        expect(response.status).toBe(200);
        expect(response.text).toContain('<!doctype html>');
        expect(response.text).toContain('id="app-shell"');
      });
    }
  });

  describe('3. Public API & Documentation Routes', () => {
    it('serves health status', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, data: { status: 'healthy' } });
    });

    it('serves VAPID push public key', async () => {
      const response = await request(app).get('/api/v1/push/public-key');
      expect(response.status).toBe(200);
      expect(response.body.data.publicKey).toBeDefined();
    });

    it('serves Swagger API documentation', async () => {
      const response = await request(app).get('/api/docs/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Swagger UI');
    });
  });

  describe('4. Protected Backend API Endpoints (Auth Guard Verification)', () => {
    const protectedGetEndpoints = [
      '/api/v1/me/profile',
      '/api/v1/me/notifications',
      '/api/v1/me/devices',
      '/api/v1/me/requests',
      '/api/v1/users',
      '/api/v1/roles',
      '/api/v1/permissions',
      '/api/v1/companies',
      '/api/v1/sites',
      '/api/v1/departments',
      '/api/v1/positions',
      '/api/v1/schedules',
      '/api/v1/employees',
      '/api/v1/attendances',
      '/api/v1/requests',
      '/api/v1/announcements',
      '/api/v1/devices',
      '/api/v1/sessions',
      '/api/v1/system/status',
      '/api/v1/audit-logs',
      '/api/v1/reports/ATTENDANCE',
      '/api/v1/tickets'
    ];

    for (const endpoint of protectedGetEndpoints) {
      it(`rejects unauthorized access to ${endpoint} with 401`, async () => {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      });
    }
  });
});
