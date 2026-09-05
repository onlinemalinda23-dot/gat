import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, Loading, ErrorBox, SuccessBox } from '../components/ui';
import { dateOnly, money, ucFirst } from '../utils/format';

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(false);
  const [jobCardId, setJobCardId] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [detail, setDetail] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/invoices', { params: { limit: 100 } }),
      api.get('/job-cards', { params: { limit: 200, status: 'completed' } }),
    ])
      .then(([i, j]) => { setRows(i.data.data); setJobCards(j.data.data); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await api.post('/invoices', {
        job_card_id: jobCardId, discount: Number(discount) || 0, tax: Number(tax) || 0,
        payment_method: paymentMethod, amount_paid: Number(amountPaid) || 0,
      });
      setOk(`Invoice ${res.data.data.invoice_number} created`);
      setModal(false); setJobCardId(''); setDiscount(''); setTax(''); setAmountPaid('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function addPayment(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post(`/invoices/${payModal.id}/payments`, { amount: Number(payAmount), method: 'cash' });
      setOk('Payment recorded — customer notified');
      setPayModal(null); setPayAmount(''); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function openDetail(r) {
    try { setDetail((await api.get(`/invoices/${r.id}`)).data.data); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  async function openPay(r) {
    try { setPayModal((await api.get(`/invoices/${r.id}`)).data.data); setPayAmount(''); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <Button onClick={() => setModal(true)}>+ Create Invoice</Button>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'invoice_number', label: 'Number' },
              { key: 'customer_name', label: 'Customer' },
              { key: 'job_card_number', label: 'Job Card' },
              { label: 'Total', render: (r) => money(r.total) },
              { label: 'Status', render: (r) => <span className={`badge badge-${r.payment_status === 'paid' ? 'green' : r.payment_status === 'partial' ? 'amber' : 'red'}`}>{r.payment_status}</span> },
              { label: 'Issued', render: (r) => dateOnly(r.issued_at) },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    <Button variant="secondary" size="btn-sm" onClick={() => openDetail(r)}>View</Button>
                    {r.payment_status !== 'paid' && <Button variant="green" size="btn-sm" onClick={() => openPay(r)}>Collect</Button>}
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create invoice">
        <form onSubmit={create} className="form-grid">
          <Field label="Completed job card" required>
            <select required value={jobCardId} onChange={(e) => setJobCardId(e.target.value)}>
              <option value="">Select job card</option>
              {jobCards.map((j) => <option key={j.id} value={j.id}>{j.job_card_number} — {j.customer_name} · {money(j.grand_total)}</option>)}
            </select>
          </Field>
          <Field label="Discount"><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          <Field label="Tax"><input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} /></Field>
          <Field label="Payment method">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option><option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option><option value="credit">Credit</option>
            </select>
          </Field>
          <Field label="Amount paid now"><input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Creating...' : 'Create invoice'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Invoice ${detail?.invoice_number}`} wide>
        {detail && (
          <>
            <div className="grid-2">
              <div>
                <div className="kv"><span>Customer</span><strong>{detail.customer_name} · {detail.customer_phone}</strong></div>
                <div className="kv"><span>Vehicle</span><strong>{detail.brand} {detail.model} · {detail.vehicle_number}</strong></div>
                <div className="kv"><span>Job card</span><strong>{detail.job_card_number}</strong></div>
              </div>
              <div>
                <div className="kv"><span>Subtotal</span><strong>{money(detail.subtotal)}</strong></div>
                <div className="kv"><span>Discount</span><strong>-{money(detail.discount)}</strong></div>
                <div className="kv"><span>Tax</span><strong>{money(detail.tax)}</strong></div>
                <div className="kv"><span>Total</span><strong>{money(detail.total)}</strong></div>
                <div className="kv"><span>Status</span><strong>{ucFirst(detail.payment_status)}</strong></div>
              </div>
            </div>
            <Table
              columns={[
                { label: 'Type', render: (r) => r.item_type },
                { label: 'Description', render: (r) => r.description },
                { key: 'quantity', label: 'Qty' },
                { key: 'unit_price', label: 'Unit' },
                { key: 'total_price', label: 'Total' },
              ]}
              rows={detail.items || []}
              empty="No items"
            />
            {detail.payments?.length > 0 && (
              <Table
                columns={[
                  { label: 'Payments', render: (r) => dateOnly(r.received_at) },
                  { label: 'Amount', render: (r) => money(r.amount) },
                  { label: 'Method', render: (r) => ucFirst(r.method) },
                ]}
                rows={detail.payments}
              />
            )}
          </>
        )}
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Collect payment — ${payModal?.invoice_number}`}>
        <form onSubmit={addPayment} className="form-grid">
          <Field label="Amount" required><input type="number" min="0.01" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
          <div className="full muted" style={{ fontSize: 12 }}>Total: {money(payModal?.total)} · Already paid: {money((payModal?.payments || []).reduce((s, p) => s + Number(p.amount), 0))}</div>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Record payment'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}