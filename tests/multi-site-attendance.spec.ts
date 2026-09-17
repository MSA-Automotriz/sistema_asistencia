import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { haversineMeters } from '../src/utils/crypto.js';

describe('Multi-Site Geofence Detection & Profile Sites (Option 1)', () => {
  let accessToken: string;

  it('1. Logs in as admin and verifies /me/profile includes all active company sites', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@msaautomotriz.com',
        password: 'ChangeMe123!',
        rememberMe: true
      });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.data.accessToken;

    const profileRes = await request(app)
      .get('/api/v1/me/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data).toBeDefined();
    expect(Array.isArray(profileRes.body.data.sites)).toBe(true);
    expect(profileRes.body.data.sites.length).toBeGreaterThan(0);

    const firstSite = profileRes.body.data.sites[0];
    expect(typeof firstSite.latitude).toBe('number');
    expect(typeof firstSite.longitude).toBe('number');
    expect(typeof firstSite.radiusMeters).toBe('number');
    expect(firstSite.name).toBeDefined();
  });

  it('2. Evaluates Haversine distance accuracy for multiple geofences', () => {
    // Sede A: MSA Principal (-7.144582, -78.512535)
    const siteALat = -7.144582;
    const siteALon = -78.512535;

    // Sede B: Sucursal Norte (-7.150000, -78.520000)
    const siteBLat = -7.150000;
    const siteBLon = -78.520000;

    // User at Sede A within 5 meters
    const userAtA = { lat: -7.144590, lon: -78.512540 };
    const distToA = haversineMeters(userAtA.lat, userAtA.lon, siteALat, siteALon);
    const distToB = haversineMeters(userAtA.lat, userAtA.lon, siteBLat, siteBLon);

    expect(distToA).toBeLessThan(20); // within 20m of A
    expect(distToB).toBeGreaterThan(500); // far from B

    // User at Sede B within 5 meters
    const userAtB = { lat: -7.150010, lon: -78.520010 };
    const distB_ToA = haversineMeters(userAtB.lat, userAtB.lon, siteALat, siteALon);
    const distB_ToB = haversineMeters(userAtB.lat, userAtB.lon, siteBLat, siteBLon);

    expect(distB_ToB).toBeLessThan(20); // within 20m of B
    expect(distB_ToA).toBeGreaterThan(500); // far from A
  });

  it('3. Rejects attendance when coordinates are far from all active sites', async () => {
    // Point far in the Pacific Ocean
    const farLat = 0.0;
    const farLon = -100.0;

    const response = await request(app)
      .post('/api/v1/attendance/check')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        latitude: farLat,
        longitude: farLon,
        type: 'CHECK_IN',
        approximateAddress: 'Océano Pacífico'
      });

    // Should fail with 403 Forbidden geofence error
    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/área autorizada/i);
  });
});
