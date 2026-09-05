import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, Loading, ErrorBox, SuccessBox } from '../components/ui';
import { dateOnly, money } from '../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(false);
  const [lines, setLines] = useState([{ part_id: '', quantity: 1, unit_cost: '' }]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/suppliers/purchases', { params: { limit: 100 } }),
      api.get('/suppliers', { params: { limit: 200 } }),
      api.get('/parts', { params: { limit: 500 } }),
    ])
      .then(([p, s, q]) => {
        setPurchases(p.data.data);
        setSuppliers(s.data.data);
        setParts(q.data.data);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function addLine() { setLines([...lines, { part_id: '', quantity: 1, unit_cost: '' }]); }
  function setLine(i, k, v) {
    const next = [...lines];
    next[i][k] = v;
    setLines(next);
  }

  const total = lines.reduce((s, l) => s + (Number(l.unit_cost) || 0) * (Number(l.quantity) || 0), 0);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    const items = lines.filter((l) => l.part_id).map((l) => ({ part_id: l.part_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
    try {
      await api.post('/suppliers/purchases', { supplier_id: supplierId, invoice_number: invoiceNumber || null, items, notes });
      setOk('Purchase recorded — stock increased automatically');
      setModal(false); setSupplierId(''); setInvoiceNumber(''); setNotes(''); setLines([{ part_id: '', quantity: 1, unit_cost: '' }]);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Purchases</h2>
        <Button onClick={() => setModal(true)}>+ Record Purchase</Button>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { label: 'Date', render: (r) => dateOnly(r.purchase_date) },
              { key: 'supplier_name', label: 'Supplier' },
              { key: 'invoice_number', label: 'Invoice' },
              { label: 'Total', render: (r) => money(r.total_amount) },
              { key: 'notes', label: 'Notes' },
            ]}
            rows={purchases}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Record purchase from supplier" wide>
        <form onSubmit={create} className="form-grid">
          <Field label="Supplier" required>
            <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier invoice number"><input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></Field>

          <div className="full">
            <h4 style={{ margin: '6px 0' }}>Items</h4>
            {lines.map((l, i) => (
              <div key={i} className="grid-2" style={{ marginBottom: 8, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                <Field label="Part">
                  <select value={l.part_id} onChange={(e) => setLine(i, 'part_id', e.target.value)}>
                    <option value="">Select part</option>
                    {parts.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.part_number}</option>)}
                  </select>
                </Field>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Field label="Qty"><input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} /></Field>
                  <Field label="Unit cost"><input type="number" min="0" step="0.01" value={l.unit_cost} onChange={(e) => setLine(i, 'unit_cost', e.target.value)} /></Field>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="btn-sm" type="button" onClick={addLine}>+ Add item</Button>
            <div style={{ float: 'right', fontSize: 16, fontWeight: 600 }}>Total: {money(total)}</div>
          </div>

          <Field label="Notes"><textarea className="full" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Save purchase'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}