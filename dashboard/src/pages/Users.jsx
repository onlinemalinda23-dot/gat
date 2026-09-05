import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox, Badge } from '../components/ui';
import { dateOnly } from '../utils/format';

const empty = { full_name: '', email: '', phone: '', password: '', role: 'mechanic' };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.get('/users', { params: { search, limit: 100 } })
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [search]);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/auth/register', form);
      setOk('Employee created'); setModal(false); setForm(empty); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function toggleActive(u) {
    if (!window.confirm(`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name}?`)) return;
    try { await api.put(`/users/${u.id}`, { is_active: !u.is_active }); setOk('User updated'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  async function setRole(u, role) {
    try { await api.put(`/users/${u.id}`, { role }); setOk('Role updated'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Employees</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Name / email" />
          <Button onClick={() => setModal(true)}>+ Add Employee</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'full_name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              {
                label: 'Role',
                render: (r) => (
                  <select value={r.role} onChange={(e) => setRole(r, e.target.value)} style={{ width: 130 }}>
                    <option value="admin">Admin</option>
                    <option value="mechanic">Mechanic</option>
                    <option value="store_keeper">Store Keeper</option>
                  </select>
                ),
              },
              { label: 'Status', render: (r) => (r.is_active ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge>) },
              { label: 'Joined', render: (r) => dateOnly(r.created_at) },
              {
                label: 'Actions', render: (r) => (
                  <Button variant={r.is_active ? 'danger' : 'secondary'} size="btn-sm" onClick={() => toggleActive(r)}>
                    {r.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add employee">
        <form onSubmit={create} className="form-grid">
          <Field label="Full name" required><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="mechanic">Mechanic</option>
              <option value="store_keeper">Store Keeper</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Email" required><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Password" required><input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}