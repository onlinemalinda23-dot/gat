import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox } from '../components/ui';
import { dateOnly, money } from '../utils/format';

const empty = { name: '', contact_number: '', address: '', email: '' };

export default function Suppliers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.get('/suppliers', { params: { search, limit: 100 } })
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [search]);

  function openCreate() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(s) { setEditing(s); setForm({ name: s.name, contact_number: s.contact_number || '', address: s.address || '', email: s.email || '' }); setModal(true); }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (editing) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post('/suppliers', form);
      setOk('Supplier saved'); setModal(false); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function openDetail(s) {
    try {
      const res = await api.get(`/suppliers/${s.id}`);
      setDetail(res.data.data);
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function remove(s) {
    if (!window.confirm(`Delete supplier ${s.name}?`)) return;
    try { await api.delete(`/suppliers/${s.id}`); setOk('Supplier deleted'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Suppliers</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Name / contact" />
          <Button onClick={openCreate}>+ Add Supplier</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'name', label: 'Supplier' },
              { key: 'contact_number', label: 'Contact' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    <Button variant="secondary" size="btn-sm" onClick={() => openDetail(r)}>History</Button>
                    <Button variant="secondary" size="btn-sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="danger" size="btn-sm" onClick={() => remove(r)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={save} className="form-grid">
          <Field label="Supplier Name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Contact Number"><input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Purchase history — ${detail?.name}`} wide>
        {detail && (
          <>
            {detail.purchases?.length ? (
              <Table
                columns={[
                  { label: 'Date', render: (r) => dateOnly(r.purchase_date) },
                  { key: 'invoice_number', label: 'Invoice' },
                  { key: 'total_amount', label: 'Total' },
                ]}
                rows={detail.purchases}
              />
            ) : <div className="empty">No purchases from this supplier yet</div>}
          </>
        )}
      </Modal>
    </>
  );
}