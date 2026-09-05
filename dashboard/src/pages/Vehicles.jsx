import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox } from '../components/ui';
import { dateOnly } from '../utils/format';

const empty = { customer_id: '', vehicle_number: '', brand: '', model: '', year: '', chassis_number: '', engine_number: '', mileage: '', fuel_type: 'petrol' };

export default function Vehicles() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/vehicles', { params: { search, limit: 100 } }),
      api.get('/customers', { params: { limit: 100 } }),
    ])
      .then(([v, c]) => { setRows(v.data.data); setCustomers(c.data.data); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [search]);

  async function handleSearchModel(e) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await api.get(`/vehicles/model/${searchBrand}/${searchModel}/history`);
      setSearchResult(res.data.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  }

  function openSearchModal() {
    setSearchBrand('');
    setSearchModel('');
    setSearchResult(null);
    setSearchModalOpen(true);
  }

  function openCreate() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(v) {
    setEditing(v);
    setForm({
      customer_id: v.customer_id, vehicle_number: v.vehicle_number, brand: v.brand, model: v.model,
      year: v.year || '', chassis_number: v.chassis_number || '', engine_number: v.engine_number || '',
      mileage: v.mileage || '', fuel_type: v.fuel_type || 'petrol',
    });
    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/vehicles/${editing.id}`, form);
      else await api.post('/vehicles', form);
      setOk('Vehicle saved'); setModal(false); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function remove(v) {
    if (!window.confirm(`Delete vehicle ${v.vehicle_number}?`)) return;
    try { await api.delete(`/vehicles/${v.id}`); setOk('Vehicle deleted'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  async function openDetail(v) {
    try {
      const res = await api.get(`/vehicles/${v.id}`);
      setDetail(res.data.data);
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Vehicles</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Number / brand / model / owner" />
          <Button variant="secondary" onClick={openSearchModal}>Search by Model</Button>
          <Button onClick={openCreate}>+ Add Vehicle</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'vehicle_number', label: 'Number' },
              { label: 'Vehicle', render: (r) => `${r.brand} ${r.model} (${r.year || '-'})` },
              { key: 'owner_name', label: 'Owner' },
              { key: 'mileage', label: 'Mileage' },
              { key: 'fuel_type', label: 'Fuel' },
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'} wide>
        <form onSubmit={save} className="form-grid">
          <Field label="Owner" required>
            <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Vehicle Number" required><input required value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></Field>
          <Field label="Brand" required><input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="Model" required><input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
          <Field label="Year"><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
          <Field label="Fuel Type"><select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
            <option>petrol</option><option>diesel</option><option>electric</option><option>hybrid</option><option>lpg</option><option>cng</option>
          </select></Field>
          <Field label="Chassis Number"><input value={form.chassis_number} onChange={(e) => setForm({ ...form, chassis_number: e.target.value })} /></Field>
          <Field label="Engine Number"><input value={form.engine_number} onChange={(e) => setForm({ ...form, engine_number: e.target.value })} /></Field>
          <Field label="Mileage"><input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Vehicle & Repair History" wide>
        {detail && (
          <>
            <div className="grid-2">
              <div>
                <h4>{detail.brand} {detail.model} ({detail.year || '-'})</h4>
                <div className="kv"><span>Number</span><strong>{detail.vehicle_number}</strong></div>
                <div className="kv"><span>Owner</span><strong>{detail.owner_name} · {detail.owner_phone}</strong></div>
                <div className="kv"><span>Chassis</span><strong>{detail.chassis_number || '-'}</strong></div>
                <div className="kv"><span>Engine</span><strong>{detail.engine_number || '-'}</strong></div>
                <div className="kv"><span>Mileage</span><strong>{detail.mileage || '-'} km</strong></div>
              </div>
              <div>
                <h4>Vehicle model part history (common parts)</h4>
                <ModelHistory brand={detail.brand} model={detail.model} />
              </div>
            </div>
            <h4 style={{ marginTop: 16 }}>Repair history</h4>
            {detail.repairHistory?.length ? (
              <Table
                columns={[
                  { label: 'Date', render: (r) => dateOnly(r.repair_date) },
                  { label: 'Parts used', render: (r) => (r.parts_used || []).join(', ') || '-' },
                  { label: 'Suppliers', render: (r) => (r.suppliers_used || []).join(', ') || '-' },
                  { key: 'summary', label: 'Summary' },
                ]}
                rows={detail.repairHistory}
              />
            ) : (
              <div className="empty">No repair history yet</div>
            )}
          </>
        )}
      </Modal>

      <Modal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} title="Search by Model" wide>
        <form onSubmit={handleSearchModel} className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Brand" required><input required value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} placeholder="e.g. Suzuki" /></Field>
          <Field label="Model" required><input required value={searchModel} onChange={(e) => setSearchModel(e.target.value)} placeholder="e.g. Wagon R" /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Button disabled={searchLoading}>{searchLoading ? 'Searching...' : 'Search'}</Button>
          </div>
        </form>
        
        {searchResult && (
          <div>
            <div className="kv" style={{ marginBottom: 16 }}>
              <span>Total Repairs</span>
              <strong>{searchResult.totalJobs} vehicles of this model repaired</strong>
            </div>
            
            {searchResult.totalJobs > 0 && (
              <div className="grid-2">
                <div>
                  <h4>Commonly Used Parts</h4>
                  <Table
                    columns={[
                      { key: 'name', label: 'Part' },
                      { key: 'total_used', label: 'Total Used' },
                    ]}
                    rows={searchResult.parts}
                  />
                </div>
                <div>
                  <h4>Suppliers for these Parts</h4>
                  {searchResult.suppliers.length > 0 ? (
                    <Table
                      columns={[
                        { key: 'name', label: 'Supplier' },
                        { key: 'contact_number', label: 'Contact' },
                      ]}
                      rows={searchResult.suppliers}
                    />
                  ) : (
                    <div className="empty">No suppliers found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function ModelHistory({ brand, model }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!brand || !model) return;
    api.get(`/vehicles/model/${brand}/${model}/history`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null));
  }, [brand, model]);

  if (!data) return <div className="empty">Select a vehicle to load model history</div>;
  if (!data.totalJobs) return <div className="empty">No history for this model</div>;
  return (
    <Table
      columns={[
        { key: 'name', label: 'Part' },
        { key: 'total_used', label: 'Total used' },
        { key: 'jobs_count', label: 'Job cards' },
      ]}
      rows={data.parts}
    />
  );
}