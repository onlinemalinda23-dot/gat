export function money(n) {
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
  return `Rs ${formatted}`;
}

export function dateTime(s) {
  if (!s) return '-';
  return new Date(s).toLocaleString();
}

export function dateOnly(s) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString();
}

export function ucFirst(s) {
  if (!s) return '-';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export const JOB_STATUS_LABELS = {
  received: 'Received',
  checking: 'Checking',
  waiting_parts: 'Waiting For Parts',
  repairing: 'Repairing',
  completed: 'Completed',
  delivered: 'Delivered',
};

export const PAYMENT_STATUS_LABELS = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  credit: 'Credit',
};

export const ESTIMATE_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted',
};