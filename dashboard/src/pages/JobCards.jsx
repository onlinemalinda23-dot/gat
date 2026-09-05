import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, SearchInput, Loading, ErrorBox, SuccessBox, StatusBadge } from '../components/ui';
import { dateOnly } from '../utils/format';

const getNowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const empty = { customer_id: '', vehicle_id: '', mechanic_id: '', complaint: '', inspection_notes: '', expected_date: '', mileage_in: '', fuel_level: '', customer_belongings: '', received_at: '' };

export default function JobCards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const [customerModal, setCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerError, setCustomerError] = useState('');

  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ customer_id: '', vehicle_number: '', brand: '', model: '', year: '', chassis_number: '', engine_number: '', mileage: '', fuel_type: 'petrol' });
  const [vehicleBusy, setVehicleBusy] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  function load() {
    setLoading(true);
    const params = { search, limit: 50 };
    if (status) params.status = status;
    Promise.all([
      api.get('/job-cards', { params }),
      api.get('/users').catch(() => ({ data: { data: [] } })),
      api.get('/customers', { params: { limit: 100 } }),
      api.get('/vehicles', { params: { limit: 100 } }),
    ])
      .then(([j, u, c, v]) => {
        setRows(j.data.data);
        setMechanics(u.data.data);
        setCustomers(c.data.data);
        setVehicles(v.data.data);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [search, status]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/job-cards', form);
      setOk(`Job card ${res.data.data.job_card_number} created`);
      setModal(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function createCustomer(e) {
    e.preventDefault();
    setCustomerBusy(true);
    setCustomerError('');
    try {
      const res = await api.post('/customers', customerForm);
      const newCustomer = res.data.data;
      setCustomers([...customers, newCustomer]);
      setForm({ ...form, customer_id: newCustomer.id, vehicle_id: '' });
      setCustomerModal(false);
      setCustomerForm({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      setCustomerError(apiErrorMessage(err));
    } finally {
      setCustomerBusy(false);
    }
  }

  async function createVehicle(e) {
    e.preventDefault();
    setVehicleBusy(true);
    setVehicleError('');
    try {
      const res = await api.post('/vehicles', vehicleForm);
      const newVehicle = res.data.data;
      setVehicles([...vehicles, newVehicle]);
      setForm({ ...form, customer_id: newVehicle.customer_id, vehicle_id: newVehicle.id });
      setVehicleModal(false);
      setVehicleForm({ customer_id: '', vehicle_number: '', brand: '', model: '', year: '', chassis_number: '', engine_number: '', mileage: '', fuel_type: 'petrol' });
    } catch (err) {
      setVehicleError(apiErrorMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  const vehiclesForCustomer = vehicles.filter((v) => v.customer_id === form.customer_id);

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Job Cards</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Number / customer / vehicle" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}>
            <option value="">All statuses</option>
            <option value="received">Received</option>
            <option value="checking">Checking</option>
            <option value="waiting_parts">Waiting For Parts</option>
            <option value="repairing">Repairing</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
          </select>
          <Button onClick={() => { setForm({ ...empty, received_at: getNowLocal() }); setModal(true); }}>+ New Job Card</Button>
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { label: 'Number', render: (r) => <a href={`#/job-cards/${r.id}`} onClick={(e) => { e.preventDefault(); navigate(`/job-cards/${r.id}`); }}>{r.job_card_number}</a> },
              { key: 'customer_name', label: 'Customer' },
              { label: 'Vehicle', render: (r) => `${r.brand} ${r.model} · ${r.vehicle_number}` },
              { key: 'mechanic_name', label: 'Mechanic' },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Received', render: (r) => dateOnly(r.received_at) },
              { label: 'Total', render: (r) => r.grand_total },
              {
                label: '', render: (r) => (
                  <Button variant="secondary" size="btn-sm" onClick={() => navigate(`/job-cards/${r.id}`)}>Open</Button>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="New Job Card" wide>
        <form onSubmit={create} className="form-grid">
          <Field label={<span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>Customer <a href="#" onClick={(e) => { e.preventDefault(); setCustomerModal(true); }}>+ New</a></span>}>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, vehicle_id: '' })}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </Field>
          <Field label={<span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>Vehicle <a href="#" onClick={(e) => { e.preventDefault(); setVehicleForm(prev => ({ ...prev, customer_id: form.customer_id })); setVehicleModal(true); }}>+ New</a></span>}>
            <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">Select vehicle</option>
              {vehiclesForCustomer.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number} · {v.brand} {v.model}</option>)}
            </select>
          </Field>
          <Field label="Mechanic">
            <select value={form.mechanic_id} onChange={(e) => setForm({ ...form, mechanic_id: e.target.value })}>
              <option value="">Not assigned</option>
              {mechanics.filter((m) => m.role === 'mechanic' || m.role === 'admin').map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Field>
          <Field label="Received at"><input type="datetime-local" value={form.received_at} onChange={(e) => setForm({ ...form, received_at: e.target.value })} /></Field>
          <Field label="Expected date"><input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></Field>
          <Field label="Mileage In"><input type="number" min="0" value={form.mileage_in} onChange={(e) => setForm({ ...form, mileage_in: e.target.value })} /></Field>
          <Field label="Fuel Level">
            <select value={form.fuel_level} onChange={(e) => setForm({ ...form, fuel_level: e.target.value })}>
              <option value="">Select level</option>
              <option value="Empty">Empty</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="3/4">3/4</option>
              <option value="Full">Full</option>
            </select>
          </Field>
          <Field label="Complaint" ><textarea required className="full" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></Field>
          <Field label="Customer Belongings"><textarea className="full" value={form.customer_belongings} onChange={(e) => setForm({ ...form, customer_belongings: e.target.value })} /></Field>
          <Field label="Inspection notes"><textarea className="full" value={form.inspection_notes} onChange={(e) => setForm({ ...form, inspection_notes: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={customerModal} onClose={() => setCustomerModal(false)} title="Add Customer">
        <form onSubmit={createCustomer} className="form-grid">
          {customerError && <ErrorBox message={customerError} />}
          <Field label="Name" required><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field>
          <Field label="Phone" required><input required value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Field>
          <Field label="Email"><input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></Field>
          <Field label="Address"><input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setCustomerModal(false)}>Cancel</Button>
            <Button disabled={customerBusy}>{customerBusy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={vehicleModal} onClose={() => setVehicleModal(false)} title="Add Vehicle">
        <form onSubmit={createVehicle} className="form-grid">
          {vehicleError && <ErrorBox message={vehicleError} />}
          <Field label="Owner" required>
            <select required value={vehicleForm.customer_id} onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </Field>
          <Field label="Vehicle Number" required><input required value={vehicleForm.vehicle_number} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })} /></Field>
          <Field label="Brand" required><input required value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} /></Field>
          <Field label="Model" required><input required value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></Field>
          <Field label="Year"><input type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} /></Field>
          <Field label="Fuel Type">
            <select value={vehicleForm.fuel_type} onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}>
              <option value="petrol">petrol</option>
              <option value="diesel">diesel</option>
              <option value="electric">electric</option>
              <option value="hybrid">hybrid</option>
              <option value="lpg">lpg</option>
              <option value="cng">cng</option>
            </select>
          </Field>
          <Field label="Chassis Number"><input value={vehicleForm.chassis_number} onChange={(e) => setVehicleForm({ ...vehicleForm, chassis_number: e.target.value })} /></Field>
          <Field label="Engine Number"><input value={vehicleForm.engine_number} onChange={(e) => setVehicleForm({ ...vehicleForm, engine_number: e.target.value })} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setVehicleModal(false)}>Cancel</Button>
            <Button disabled={vehicleBusy}>{vehicleBusy ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}