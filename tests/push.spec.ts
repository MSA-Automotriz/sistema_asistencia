import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { PushService } from '../src/use-cases/notifications/push-service.js';

describe('Web Push API & Service', () => {
  it('GET /api/v1/push/public-key returns the VAPID public key', async () => {
    const response = await request(app).get('/api/v1/push/public-key');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        publicKey: expect.any(String)
      })
    });
    expect(response.body.data.publicKey.length).toBeGreaterThan(20);
  });

  it('rejects unauthenticated push subscription', async () => {
    const response = await request(app)
      .post('/api/v1/push/subscribe')
      .send({
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test',
        keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' }
      });
    expect(response.status).toBe(401);
  });

  it('PushService initializes and retrieves VAPID public key', () => {
    const pushService = new PushService();
    const key = pushService.getPublicKey();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(20);
  });
});
