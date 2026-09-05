import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox, Badge } from '../components/ui';
import { money } from '../utils/format';

const empty = { name: '', part_number: '', category: '', supplier_id: '', purchase_price: '', selling_price: '', quantity: '', low_stock_threshold: 5, warranty_months: '' };

export default function Parts() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockType, setStockType] = useState('add');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/parts', { params: { search, limit: 200 } }),
      api.get('/suppliers', { params: { limit: 200 } }),
    ])
      .then(([p, s]) => { setRows(p.data.data); setSuppliers(s.data.data); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [search]);

  function openCreate() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name, part_number: p.part_number, category: p.category || '', supplier_id: p.supplier_id || '',
      purchase_price: p.purchase_price, selling_price: p.selling_price, quantity: p.quantity,
      low_stock_threshold: p.low_stock_threshold, warranty_months: p.warranty_months || '',
    });
    setModal(true);
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (editing) await api.put(`/parts/${editing.id}`, form);
      else await api.post('/parts', form);
      setOk('Part saved'); setModal(false); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function adjustStock(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const endpoint = stockType === 'add' ? 'add-stock' : 'remove-stock';
      await api.post(`/parts/${stockModal.id}/${endpoint}`, { quantity: Number(stockQty) });
      setOk('Stock adjusted'); setStockModal(null); setStockQty(''); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Parts & Inventory</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Name / part number" />
          <Button onClick={openCreate}>+ Add Part</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'name', label: 'Part' },
              { key: 'part_number', label: 'Part No' },
              { key: 'category', label: 'Category' },
              { label: 'Supplier', render: (r) => r.supplier_name || '-' },
              { key: 'purchase_price', label: 'Buy' },
              { key: 'selling_price', label: 'Sell' },
              { label: 'Warranty', render: (r) => r.warranty_months ? `${r.warranty_months} mo` : '-' },
              {
                label: 'Stock',
                render: (r) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <strong>{r.quantity}</strong>
                    {r.quantity <= r.low_stock_threshold && <Badge color="red">low</Badge>}
                  </span>
                ),
              },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    <Button variant="secondary" size="btn-sm" onClick={() => { setStockModal(r); setStockType('add'); }}>+ Stock</Button>
                    <Button variant="secondary" size="btn-sm" onClick={() => { setStockModal(r); setStockType('remove'); }}>- Stock</Button>
                    <Button variant="secondary" size="btn-sm" onClick={() => openEdit(r)}>Edit</Button>
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Part' : 'Add Part'} >
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Part Number" required><input required value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Supplier">
            <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Purchase price"><input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></Field>
          <Field label="Selling price"><input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Field>
          <Field label="Warranty (Months)"><input type="number" min="0" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} /></Field>
          <Field label="Low stock threshold"><input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></Field>
          {!editing && <Field label="Initial quantity"><input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>}
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockType === 'add' ? `Add stock — ${stockModal?.name}` : `Remove stock — ${stockModal?.name}`}>
        <form onSubmit={adjustStock} className="form-grid">
          <Field label="Quantity" required><input type="number" min="1" required value={stockQty} onChange={(e) => setStockQty(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setStockModal(null)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}