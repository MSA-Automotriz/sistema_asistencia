import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('reports a healthy service', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'healthy' } });
  });

  it('serves index.html on root GET /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });

  it('serves index.html for SPA frontend routes', async () => {
    const response = await request(app).get('/dashboard');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });
});
