import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Table, Loading, ErrorBox, SuccessBox, Badge } from '../components/ui';
import { dateTime } from '../utils/format';

const STATUS_COLORS = {
  scheduled: 'blue',
  arrived: 'green',
  cancelled: 'red',
  no_show: 'amber',
};

export default function Appointments() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/appointments', { params: { limit: 100 } }),
      api.get('/customers', { params: { limit: 500 } }),
      api.get('/vehicles', { params: { limit: 1000 } }),
    ])
      .then(([a, c, v]) => {
        setRows(a.data.data);
        setCustomers(c.data.data);
        setVehicles(v.data.data);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/appointments', { customer_id: customerId, vehicle_id: vehicleId, scheduled_at: scheduledAt, service_type: serviceType, notes });
      setOk('Appointment created');
      setModal(false); setCustomerId(''); setVehicleId(''); setScheduledAt(''); setServiceType(''); setNotes('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function updateStatus(id, status) {
    if (!window.confirm(`Mark appointment as ${status}?`)) return;
    try { await api.put(`/appointments/${id}/status`, { status }); setOk('Appointment updated'); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
  }

  const customerVehicles = vehicles.filter((v) => v.customer_id === customerId);

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Appointments</h2>
        <Button onClick={() => setModal(true)}>+ New Appointment</Button>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { label: 'Date/Time', render: (r) => dateTime(r.scheduled_at) },
              { key: 'customer_name', label: 'Customer' },
              { label: 'Vehicle', render: (r) => `${r.brand} ${r.model} (${r.vehicle_number})` },
              { key: 'service_type', label: 'Service' },
              { label: 'Status', render: (r) => <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge> },
              {
                label: 'Actions', render: (r) => (
                  <div className="actions">
                    {r.status === 'scheduled' && <Button variant="secondary" size="btn-sm" onClick={() => updateStatus(r.id, 'arrived')}>Arrived</Button>}
                    {r.status === 'scheduled' && <Button variant="secondary" size="btn-sm" onClick={() => updateStatus(r.id, 'no_show')}>No Show</Button>}
                    {r.status === 'scheduled' && <Button variant="danger" size="btn-sm" onClick={() => updateStatus(r.id, 'cancelled')}>Cancel</Button>}
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Schedule appointment">
        <form onSubmit={create} className="form-grid">
          <Field label="Customer" required>
            <select required value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVehicleId(''); }}>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
            </select>
          </Field>
          <Field label="Vehicle" required>
            <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId}>
              <option value="">Select vehicle</option>
              {customerVehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number} — {v.brand} {v.model}</option>)}
            </select>
          </Field>
          <Field label="Scheduled Date & Time" required><input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
          <Field label="Service Type"><input placeholder="e.g. Full Service, Oil Change" value={serviceType} onChange={(e) => setServiceType(e.target.value)} /></Field>
          <Field label="Notes"><textarea className="full" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button disabled={busy}>{busy ? 'Scheduling...' : 'Schedule'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
