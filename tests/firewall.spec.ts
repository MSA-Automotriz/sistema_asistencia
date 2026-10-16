import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('Web Application Firewall (WAF) & Security Middleware', () => {
  describe('1. Suspicious User-Agent Blocking', () => {
    it('should block requests with sqlmap user-agent', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('User-Agent', 'sqlmap/1.5.11#stable');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cortafuegos');
    });

    it('should block requests with nikto scanner user-agent', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('User-Agent', 'Mozilla/5.0 (Nikto/2.1.6)');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow legitimate browser user-agent', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('2. SQL Injection (SQLi) Prevention', () => {
    it('should block UNION SELECT patterns in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/health?search=1%20UNION%20SELECT%20null,null')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should block SQL injection in request body fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "admin' UNION SELECT 1,2,3 -- ",
          password: 'Password123!'
        })
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should NOT block complex passwords that might have special characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'normal_user@example.com',
          password: 'Password!#123; DROP TABLE users;'
        })
        .set('User-Agent', 'Mozilla/5.0');

      // Should bypass WAF and reach authentication logic (returning 400 or 401, not 403 WAF block)
      expect(response.status).not.toBe(403);
    });
  });

  describe('3. Cross-Site Scripting (XSS) Prevention', () => {
    it('should block <script> tags in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/health?q=<script>alert("xss")</script>')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should block javascript: pseudo-protocol payloads in query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/health?redirect=javascript:alert(1)')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should block inline event handlers in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '<img src=x onerror=alert(1)>',
          password: 'ValidPassword1!'
        })
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('4. Path Traversal & LFI Prevention', () => {
    it('should block path traversal sequences in query strings', async () => {
      const response = await request(app)
        .get('/api/v1/health?file=../../../../etc/passwd')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should block encoded path traversal sequences', async () => {
      const response = await request(app)
        .get('/api/v1/health?file=%2e%2e%2f%2e%2e%2fwin.ini')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('5. HTTP Method Filtering', () => {
    it('should block unsupported or dangerous HTTP methods like TRACE or PROPFIND', async () => {
      const customAgent = request(app) as unknown as Record<string, (url: string) => request.Test>;
      const response = await customAgent.propfind('/api/v1/health').set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(405);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Método HTTP no admitido');
    });
  });

  describe('6. Security Headers (CSP & Helmet)', () => {
    it('should include Content-Security-Policy and anti-clickjacking headers', async () => {
      const response = await request(app).get('/');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
