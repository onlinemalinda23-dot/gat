import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, Loading, ErrorBox, SuccessBox, StatusBadge } from '../components/ui';
import { dateOnly, money, ESTIMATE_STATUS_LABELS } from '../utils/format';

export default function Estimates() {
  const [rows, setRows] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(false);
  const [jobCardId, setJobCardId] = useState('');
  const [discount, setDiscount] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/estimates', { params: { limit: 100 } }),
      api.get('/job-cards', { params: { limit: 100 } }),
    ])
      .then(([e, j]) => { setRows(e.data.data); setJobCards(j.data.data.filter((x) => x.status !== 'delivered')); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await api.post('/estimates', { job_card_id: jobCardId, discount: Number(discount) || 0, valid_until: validUntil || null, notes });
      setOk(`Estimate ${res.data.data.estimate_number} created`);
      setModal(false); setJobCardId(''); setDiscount(''); setValidUntil(''); setNotes('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function updateStatus(id, status) {
    if (!window.confirm(`Mark estimate "${ESTIMATE_STATUS_LABELS[status]}"?`)) return;
    try { await api.put(`/estimates/${id}`, { status }); setOk('Estimate updated'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  async function openDetail(r) {
    try { setDetail((await api.get(`/estimates/${r.id}`)).data.data); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Estimates</h2>
        <Button onClick={() => setModal(true)}>+ Create Estimate</Button>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'estimate_number', label: 'Number' },
              { key: 'customer_name', label: 'Customer' },
              { label: 'Vehicle', render: (r) => `${r.brand} ${r.model}` },
              { label: 'Parts', render: (r) => money(r.parts_cost) },
              { label: 'Labour', render: (r) => money(r.labour_cost) },
              { label: 'Total', render: (r) => money(r.total) },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    <Button variant="secondary" size="btn-sm" onClick={() => openDetail(r)}>View</Button>
                    {r.status === 'pending' && <Button variant="green" size="btn-sm" onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>}
                    {r.status === 'pending' && <Button variant="danger" size="btn-sm" onClick={() => updateStatus(r.id, 'rejected')}>Reject</Button>}
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create estimate from job card">
        <form onSubmit={create} className="form-grid">
          <Field label="Job Card" required>
            <select required value={jobCardId} onChange={(e) => setJobCardId(e.target.value)}>
              <option value="">Select job card</option>
              {jobCards.map((j) => <option key={j.id} value={j.id}>{j.job_card_number} — {j.customer_name} · {j.vehicle_number}</option>)}
            </select>
          </Field>
          <Field label="Discount"><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          <Field label="Valid until"><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
          <Field label="Notes"><textarea className="full" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Estimate ${detail?.estimate_number}`} wide>
        {detail && (
          <>
            <div className="grid-2">
              <div>
                <div className="kv"><span>Customer</span><strong>{detail.customer_name} · {detail.customer_phone}</strong></div>
                <div className="kv"><span>Vehicle</span><strong>{detail.brand} {detail.model} · {detail.vehicle_number}</strong></div>
                <div className="kv"><span>Job card</span><strong>{detail.job_card_number}</strong></div>
              </div>
              <div>
                <div className="kv"><span>Parts</span><strong>{money(detail.parts_cost)}</strong></div>
                <div className="kv"><span>Labour</span><strong>{money(detail.labour_cost)}</strong></div>
                <div className="kv"><span>Discount</span><strong>-{money(detail.discount)}</strong></div>
                <div className="kv"><span>Total</span><strong>{money(detail.total)}</strong></div>
              </div>
            </div>
            <Table
              columns={[
                { label: 'Type', render: (r) => r.item_type },
                { label: 'Description', render: (r) => r.part_name || r.description || r.part_number },
                { key: 'quantity', label: 'Qty' },
                { key: 'unit_price', label: 'Unit' },
                { key: 'total_price', label: 'Total' },
              ]}
              rows={detail.items || []}
            />
          </>
        )}
      </Modal>
    </>
  );
}