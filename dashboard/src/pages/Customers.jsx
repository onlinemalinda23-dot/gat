import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox } from '../components/ui';
import { dateTime, ucFirst } from '../utils/format';

const empty = { name: '', phone: '', address: '', email: '' };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/customers', { params: { search, limit: 100 } })
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [search]);

  function openCreate() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(c) { setEditing(c); setForm({ name: c.name, phone: c.phone, address: c.address || '', email: c.email || '' }); setModal(true); }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post('/customers', form);
      setOk('Customer saved');
      setModal(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function remove(c) {
    if (!window.confirm(`Delete customer ${c.name}? Vehicles will also be deleted.`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      setOk('Customer deleted');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Customers</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name / phone / email" />
          <Button onClick={openCreate}>+ Add Customer</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              { label: 'Created', render: (r) => dateTime(r.created_at) },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    <Button variant="secondary" size="btn-sm" onClick={() => openEdit(r)}>Edit</Button>
                    <Button variant="danger" size="btn-sm" onClick={() => remove(r)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            rows={rows.map((r) => ({ ...r, address: r.address || ucFirst('—') }))}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone" required><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}