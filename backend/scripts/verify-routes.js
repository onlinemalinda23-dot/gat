const request = require('supertest');
const app = require('../src/app');

const PROTECTED = [
  '/api/v1/customers',
  '/api/v1/vehicles',
  '/api/v1/job-cards',
  '/api/v1/parts',
  '/api/v1/suppliers',
  '/api/v1/suppliers/purchases',
  '/api/v1/invoices',
  '/api/v1/reports/daily',
  '/api/v1/users',
  '/api/v1/notifications',
  '/api/v1/estimates',
  '/api/v1/auth/profile',
];

async function main() {
  let failures = 0;
  for (const p of PROTECTED) {
    const res = await request(app).get(p);
    const ok = res.status === 401;
    if (!ok) failures++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} GET ${p} -> ${res.status}`);
  }

  // Public / reachable regardless of DB
  const health = await request(app).get('/health');
  console.log(`${health.status === 200 ? 'OK  ' : 'FAIL'} GET /health -> ${health.status}`);

  // Unknown route
  const missing = await request(app).get('/api/v1/nope');
  console.log(`${missing.status === 404 ? 'OK  ' : 'FAIL'} GET /api/v1/nope -> ${missing.status}`);

  console.log(failures === 0 ? '\nALL ROUTE CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();