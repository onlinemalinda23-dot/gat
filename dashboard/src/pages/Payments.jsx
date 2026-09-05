import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Table, Loading, ErrorBox, Badge } from '../components/ui';
import { dateTime, dateOnly, money, PAYMENT_METHOD_LABELS } from '../utils/format';

const MAX_INVOICES = 50;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const invoices = (await api.get('/invoices', { params: { limit: MAX_INVOICES } })).data.data || [];
        // Payments live under each invoice; collect them from the real detail
        // endpoint rather than inventing a /payments resource.
        const details = await Promise.allSettled(invoices.map((inv) => api.get(`/invoices/${inv.id}`)));
        if (!mounted) return;
        const collected = [];
        details.forEach((d, i) => {
          if (d.status !== 'fulfilled') return;
          const inv = d.value.data.data;
          (inv.payments || []).forEach((p) => {
            collected.push({ ...p, invoice_number: inv.invoice_number, customer_name: inv.customer_name, invoice_id: inv.id });
          });
        });
        collected.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
        setPayments(collected);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Payments</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>All recorded payments from invoices{payments.length > 0 ? ` (latest ${MAX_INVOICES} invoices scanned)` : ''}</p>
      </div>
      <ErrorBox message={error} />

      <div className="stats">
        <Card className="stat">
          <div className="stat-value">{payments.length}</div>
          <div className="stat-label">Payments recorded</div>
        </Card>
        <Card className="stat accent">
          <div className="stat-value">{money(totalReceived)}</div>
          <div className="stat-label">Total received</div>
        </Card>
        <Card className="stat">
          <div className="stat-value">
            {payments.length > 0 ? dateOnly(payments[payments.length - 1].received_at) : '—'}
          </div>
          <div className="stat-label">Latest payment date</div>
        </Card>
      </div>

      <Card title="Payment ledger">
        {loading ? <Loading /> : (
          <Table
            columns={[
              { label: 'Date', render: (r) => dateTime(r.received_at) },
              { key: 'invoice_number', label: 'Invoice' },
              { key: 'customer_name', label: 'Customer' },
              { label: 'Method', render: (r) => PAYMENT_METHOD_LABELS[r.method] || r.method || '—' },
              { label: 'Reference', render: (r) => r.reference || '—' },
              { label: 'Amount', render: (r) => <strong>{money(r.amount)}</strong> },
              { label: 'Status', render: (r) => <Badge color="green">received</Badge> },
            ]}
            rows={payments}
            empty="No payments recorded yet — collect one from the Invoices page"
          />
        )}
      </Card>
    </>
  );
}