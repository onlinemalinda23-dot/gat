/**
 * Domain model constants.
 * Kept in one place so API responses and validations stay consistent.
 * (Data access uses parameterized SQL — this file defines the domain vocabulary.)
 */

const ROLES = ['admin', 'mechanic', 'store_keeper'];

const JOB_STATUSES = ['received', 'checking', 'waiting_parts', 'repairing', 'completed', 'delivered'];

const JOB_STATUS_LABELS = {
  received: 'Received',
  checking: 'Checking',
  waiting_parts: 'Waiting For Parts',
  repairing: 'Repairing',
  completed: 'Completed',
  delivered: 'Delivered',
};

const PAYMENT_STATUSES = ['paid', 'partial', 'unpaid'];

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'credit'];

const ESTIMATE_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'converted'];

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng'];

const STOCK_OPERATIONS = ['purchase', 'job_card_use', 'manual_adjustment', 'sale', 'return'];

module.exports = {
  ROLES,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  ESTIMATE_STATUSES,
  FUEL_TYPES,
  STOCK_OPERATIONS,
};