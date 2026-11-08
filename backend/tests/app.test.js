// Smoke tests run in CI before any image is built. They exercise the HTTP layer
// without needing a database (auth guard rejects before any DB lookup).
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret';
const app = require('../app');

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('unknown route returns 404 JSON', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.strictEqual(res.status, 404);
  assert.match(res.body.message, /Route not found/);
});

test('protected route without token returns 401', async () => {
  const res = await request(app).get('/api/expenses');
  assert.strictEqual(res.status, 401);
});

test('protected route with invalid token returns 401', async () => {
  const res = await request(app).get('/api/expenses').set('Authorization', 'Bearer not-a-jwt');
  assert.strictEqual(res.status, 401);
});
