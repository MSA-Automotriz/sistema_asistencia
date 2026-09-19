import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/database/prisma.js';

describe('Calendar Employee Birthdays Integration', () => {
  it('returns employee birthdays within the requested calendar date range', async () => {
    // 1. Authenticate as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@msaautomotriz.com',
        password: 'ChangeMe123!'
      });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken;

    // 2. Ensure an employee has a known birthday in September
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@msaautomotriz.com' },
      include: { employee: true }
    });
    expect(adminUser).toBeDefined();

    if (adminUser?.employee) {
      await prisma.employee.update({
        where: { id: adminUser.employee.id },
        data: { birthDate: new Date('1992-09-24T00:00:00.000Z') }
      });
    }

    // 3. Query calendar for September 2026
    const res = await request(app)
      .get('/api/v1/attendance/calendar?startDate=2026-09-01T00:00:00.000Z&endDate=2026-09-30T23:59:59.999Z')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.events)).toBe(true);

    // 4. Verify birthday event is generated
    const birthdayEvent = res.body.data.events.find(
      (ev: { category: string; title: string }) => ev.category === 'BIRTHDAY'
    );
    expect(birthdayEvent).toBeDefined();
    expect(birthdayEvent.status).toBe('CELEBRATION');
    expect(birthdayEvent.title).toContain(adminUser?.firstName);
  });
});
