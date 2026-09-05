const { JOB_STATUSES, JOB_STATUS_LABELS, ROLES, PAYMENT_METHODS } = require('../src/models');

describe('model constants', () => {
  test('all job statuses have labels', () => {
    for (const s of JOB_STATUSES) {
      expect(JOB_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  test('roles contain admin / mechanic / store_keeper', () => {
    expect(ROLES).toContain('admin');
    expect(ROLES).toContain('mechanic');
    expect(ROLES).toContain('store_keeper');
  });

  test('payment methods include required options', () => {
    for (const m of ['cash', 'card', 'bank_transfer', 'credit']) {
      expect(PAYMENT_METHODS).toContain(m);
    }
  });
});