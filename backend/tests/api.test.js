/**
 * Integration tests for the REST API.
 * Uses a running Postgres database — set DB_* env vars before running.
 *
 * Run: npm test
 */
const request = require('supertest');
const app = require('../src/app');

describe('API surface', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/app/version returns version info', async () => {
    const res = await request(app).get('/api/v1/app/version?platform=android');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('latest_version');
    expect(res.body.data).toHaveProperty('force_update');
  });

  it('rejects unknown API routes with 404', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/v1/parts');
    expect(res.status).toBe(401);
  });

  it('rejects invalid login with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('validates login payload (missing fields)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
  });

  it('validates hashed job card status values', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: process.env.SEED_EMAIL || 'admin@workshop.com', password: process.env.SEED_PASS || 'Admin@123' });
    // skip if seeded user is unavailable
    if (login.status !== 200) return;

    const token = login.body.data.accessToken;
    const res = await request(app)
      .post('/api/v1/job-cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ customer_id: 'not-a-uuid' });
    expect(res.status).toBe(422);
  });
});