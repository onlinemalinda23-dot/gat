/**
 * End-to-end API smoke test against the REAL database (driver-agnostic —
 * works on the embedded local DB and on PostgreSQL).
 *
 * Exercises: auth + role permissions, customers, vehicles, job cards,
 * inventory deduction, labour, purchase + inventory increase, estimates,
 * invoices + payments, reports, notifications, vehicle-model part history.
 */
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');

const UNIQ = Date.now().toString().slice(-6);
let failures = 0;

function check(tag, cond, extra) {
  if (cond) console.log(`  OK   ${tag}`);
  else {
    failures++;
    console.log(`  FAIL ${tag}${extra ? ' — ' + extra : ''}`);
  }
}

const M = (r) => (r.body && r.body.message) || r.status;

async function main() {
  // ---- Authentication ----
  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@workshop.com', password: 'Admin@123' });
  check('admin login', adminLogin.status === 200, M(adminLogin));
  const admin = adminLogin.body.data.accessToken;
  const A = () => ({ Authorization: 'Bearer ' + admin });

  const storeLogin = await request(app).post('/api/v1/auth/login').send({ email: 'store@workshop.com', password: 'Admin@123' });
  check('store keeper login', storeLogin.status === 200, M(storeLogin));
  const store = storeLogin.body.data.accessToken;
  const S = () => ({ Authorization: 'Bearer ' + store });

  const mechanicLogin = await request(app).post('/api/v1/auth/login').send({ email: 'mechanic@workshop.com', password: 'Admin@123' });
  check('mechanic login', mechanicLogin.status === 200, M(mechanicLogin));
  const mechanic = mechanicLogin.body.data.accessToken;
  const mech = () => ({ Authorization: 'Bearer ' + mechanic });

  // ---- Role permissions ----
  const denyReports = await request(app).get('/api/v1/reports/daily').set(S());
  check('storekeeper denied /reports/daily (403)', denyReports.status === 403, M(denyReports));
  const denyParts = await request(app).post('/api/v1/parts').set(mech()).send({ name: 'x', part_number: 'x' });
  check('mechanic denied create part (403)', denyParts.status === 403, M(denyParts));

  // ---- Customer CRUD ----
  const customer = await request(app).post('/api/v1/customers').set(A()).send({ name: `Smoke Customer ${UNIQ}`, phone: '+9477' + UNIQ + '00' });
  check('create customer', customer.status === 201 || customer.status === 200, M(customer));
  const customerId = customer.body.data.id;
  const customers = await request(app).get('/api/v1/customers').set(A());
  check('list customers', customers.status === 200 && customers.body.data.length > 0, M(customers));

  // ---- Vehicle CRUD ----
  const vehicle = await request(app).post('/api/v1/vehicles').set(A()).send({
    customer_id: customerId,
    vehicle_number: 'SMOKE-' + UNIQ,
    brand: 'SmokeBrand',
    model: 'Tester',
    year: 2022,
    fuel_type: 'petrol',
  });
  check('create vehicle', vehicle.status === 201 || vehicle.status === 200, M(vehicle));
  const vehicleId = vehicle.body.data.id;

  // ---- Part (create with stock) ----
  const partCreate = await request(app).post('/api/v1/parts').set(A()).send({
    name: `Smoke Part ${UNIQ}`,
    part_number: 'SM-' + UNIQ,
    category: 'Smoke',
    purchase_price: 10,
    selling_price: 20,
    quantity: 10,
    low_stock_threshold: 2,
  });
  check('create part', partCreate.status === 201 || partCreate.status === 200, M(partCreate));
  const partId = partCreate.body.data.id;

  // ---- Job card workflow + inventory deduction ----
  const job = await request(app).post('/api/v1/job-cards').set(A()).send({
    customer_id: customerId,
    vehicle_id: vehicleId,
    mechanic_id: mechanicLogin.body.data.user.id,
    complaint: `Smoke test complaint ${UNIQ}`,
    status: 'received',
  });
  check('create job card', job.status === 201 || job.status === 200, M(job));
  const jobId = job.body.data.id;

  const issuePart = await request(app).post(`/api/v1/job-cards/${jobId}/parts`).set(A()).send({ part_id: partId, quantity: 2 });
  check('issue part to job card', issuePart.status === 201 || issuePart.status === 200, M(issuePart));

  const partAfterIssue = await request(app).get(`/api/v1/parts/${partId}`).set(A());
  const qtyAfterIssue = Number(partAfterIssue.body.data.quantity);
  check('inventory deducted (10 -> 8)', qtyAfterIssue === 8, `qty=${qtyAfterIssue}`);

  const addLabour = await request(app).post(`/api/v1/job-cards/${jobId}/labour`).set(A()).send({ description: 'Diagnostic', amount: 50 });
  check('add labour', addLabour.status === 201 || addLabour.status === 200, M(addLabour));

  const addNote = await request(app).post(`/api/v1/job-cards/${jobId}/notes`).set(A()).send({ note: 'Smoke note' });
  check('add repair note', addNote.status === 201 || addNote.status === 200, M(addNote));

  const setStatus = await request(app).put(`/api/v1/job-cards/${jobId}/status`).set(A()).send({ status: 'completed' });
  check('job card status -> completed', setStatus.status === 200, M(setStatus));

  const jobDetail = await request(app).get(`/api/v1/job-cards/${jobId}`).set(A());
  check('job card detail has parts+labour', jobDetail.status === 200 && jobDetail.body.data.parts && jobDetail.body.data.parts.length === 1 && jobDetail.body.data.labourCharges && jobDetail.body.data.labourCharges.length === 1, M(jobDetail));

  // ---- Purchase + inventory increase ----
  const suppliers = await request(app).get('/api/v1/suppliers').set(A());
  const supplierId = suppliers.body.data[0].id;
  const purchase = await request(app).post('/api/v1/suppliers/purchases').set(S()).send({
    supplier_id: supplierId,
    invoice_number: 'INV-SM-' + UNIQ,
    items: [{ part_id: partId, quantity: 5, unit_cost: 10 }],
  });
  check('record purchase (+5 stock)', purchase.status === 201, M(purchase));

  const partAfterPurchase = await request(app).get(`/api/v1/parts/${partId}`).set(A());
  const qtyAfterPurchase = Number(partAfterPurchase.body.data.quantity);
  check('inventory increased (8 -> 13)', qtyAfterPurchase === 13, `qty=${qtyAfterPurchase}`);

  // ---- Estimate flow ----
  const estimate = await request(app).post('/api/v1/estimates').set(A()).send({ job_card_id: jobId, discount: 0 });
  check('create estimate from job card', estimate.status === 201 || estimate.status === 200, M(estimate));
  const estimateId = estimate.body.data.id;
  const approveEstimate = await request(app).put(`/api/v1/estimates/${estimateId}`).set(A()).send({ status: 'approved' });
  check('approve estimate', approveEstimate.status === 200, M(approveEstimate));
  const estimates = await request(app).get('/api/v1/estimates').set(A());
  check('list estimates', estimates.status === 200 && estimates.body.data.length > 0, M(estimates));

  // ---- Invoice + payments ----
  const invoice = await request(app).post('/api/v1/invoices').set(A()).send({ job_card_id: jobId, tax: 0, discount: 0, payment_method: 'cash' });
  check('create invoice', invoice.status === 201 || invoice.status === 200, M(invoice));
  const invoiceId = invoice.body.data.id;
  const payment = await request(app).post(`/api/v1/invoices/${invoiceId}/payments`).set(A()).send({ amount: 30, method: 'cash' });
  check('record payment', payment.status === 201 || payment.status === 200, M(payment));
  const invoiceDetail = await request(app).get(`/api/v1/invoices/${invoiceId}`).set(A());
  const paid = (invoiceDetail.body.data.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const pending = Number(invoiceDetail.body.data.total) - paid;
  check('invoice pending reflects payment', invoiceDetail.status === 200 && pending >= 0 && paid > 0, M(invoiceDetail));
  const invoices = await request(app).get('/api/v1/invoices').set(A());
  check('list invoices', invoices.status === 200 && invoices.body.data.length > 0, M(invoices));

  // ---- Vehicle-model part history ----
  const modelHistory = await request(app).get('/api/v1/vehicles/model/SmokeBrand/Tester/history').set(A());
  check('vehicle-model part history', modelHistory.status === 200, M(modelHistory));

  // ---- Vehicle repair history ----
  const vehicleDetail = await request(app).get(`/api/v1/vehicles/${vehicleId}`).set(A());
  check('vehicle detail', vehicleDetail.status === 200, M(vehicleDetail));

  // ---- Reports ----
  const daily = await request(app).get('/api/v1/reports/daily').set(A());
  check('daily report', daily.status === 200, M(daily));
  const monthly = await request(app).get('/api/v1/reports/monthly').set(A());
  check('monthly report', monthly.status === 200, M(monthly));

  // ---- Notifications ----
  const notifications = await request(app).get('/api/v1/notifications').set(A());
  check('notifications list', notifications.status === 200, M(notifications));

  // ---- User management (admin) ----
  const users = await request(app).get('/api/v1/users').set(A());
  check('list users', users.status === 200 && users.body.data.length >= 3, M(users));

  // ---- App version check (public) ----
  const version = await request(app).get('/api/v1/app/version?platform=android');
  check('app version endpoint', version.status === 200 && version.body.data.latest_version, M(version));

  console.log(failures === 0 ? '\nSMOKE ALL PASSED' : `\nSMOKE FAILURES: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('SMOKE ERROR', e);
  process.exit(1);
});