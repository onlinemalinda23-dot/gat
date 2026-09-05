import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Modal, Field, Loading, ErrorBox, SuccessBox, StatusBadge } from '../components/ui';
import { dateOnly, dateTime, money, JOB_STATUS_LABELS } from '../utils/format';

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [noteModal, setNoteModal] = useState(false);
  const [partModal, setPartModal] = useState(false);
  const [labourModal, setLabourModal] = useState(false);

  const [note, setNote] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [labDesc, setLabDesc] = useState('');
  const [labAmount, setLabAmount] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/job-cards/${id}`)
      .then((res) => setJob(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get('/parts', { params: { limit: 500 } }).then((res) => setParts(res.data.data)).catch(() => {});
  }, [id]);

  async function changeStatus(next) {
    if (!window.confirm(`Move job card to "${JOB_STATUS_LABELS[next]}"?`)) return;
    try {
      await api.put(`/job-cards/${id}/status`, { status: next });
      setOk('Status updated');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function addNote(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/job-cards/${id}/notes`, { note }); setOk('Note added'); setNote(''); setNoteModal(false); load(); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function addPart(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post(`/job-cards/${id}/parts`, { part_id: selectedPart, quantity: Number(partQty) });
      setOk('Parts issued (stock deducted)'); setPartModal(false); setPartQty(1); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function addLabour(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post(`/job-cards/${id}/labour`, { description: labDesc, amount: Number(labAmount) });
      setOk('Labour added'); setLabDesc(''); setLabAmount(''); setLabourModal(false); load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  if (!job) return <ErrorBox message={error || 'Not found'} />;

  const deductable = parts.filter((p) => p.is_active !== false && p.quantity > 0);

  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => navigate('/job-cards')}>← Back</Button>
          <h2 style={{ margin: 0 }}>{job.job_card_number}</h2>
          <StatusBadge status={job.status} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['checking', 'repairing', 'completed', 'delivered']).map((s) => s !== job.status && (
            <Button key={s} variant="secondary" size="btn-sm" onClick={() => changeStatus(s)}>
              → {JOB_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />

      <div className="detail-grid">
        <div>
          <Card title="Job details">
            <div className="grid-2">
              <div>
                <div className="kv"><span>Customer</span><strong>{job.customer_name} ({job.customer_phone})</strong></div>
                <div className="kv"><span>Vehicle</span><strong>{job.brand} {job.model} · {job.vehicle_number}</strong></div>
                <div className="kv"><span>Mechanic</span><strong>{job.mechanic_name || 'Unassigned'}</strong></div>
                <div className="kv"><span>Received</span><strong>{dateTime(job.received_at)}</strong></div>
                <div className="kv"><span>Mileage</span><strong>{job.mileage_in || '-'}</strong></div>
                <div className="kv"><span>Fuel Level</span><strong>{job.fuel_level || '-'}</strong></div>
              </div>
              <div>
                <div className="kv"><span>Complaint</span><strong>{job.complaint}</strong></div>
                <div className="kv"><span>Inspection notes</span><strong>{job.inspection_notes || '-'}</strong></div>
                <div className="kv"><span>Belongings</span><strong>{job.customer_belongings || '-'}</strong></div>
                <div className="kv"><span>Expected</span><strong>{job.expected_date ? dateOnly(job.expected_date) : '-'}</strong></div>
              </div>
            </div>
            <div className="stats" style={{ marginTop: 8 }}>
              <div className="stat"><div className="stat-label">Parts cost</div><div className="stat-value">{money(job.total_parts_cost)}</div></div>
              <div className="stat"><div className="stat-label">Labour cost</div><div className="stat-value">{money(job.total_labour_cost)}</div></div>
              <div className="stat"><div className="stat-label">Grand total</div><div className="stat-value">{money(job.grand_total)}</div></div>
            </div>
          </Card>

          <Card title="Parts issued" actions={<Button size="btn-sm" onClick={() => setPartModal(true)}>+ Issue part</Button>}>
            {job.parts?.length ? (
              <table className="table">
                <thead><tr><th>Part</th><th>Warranty</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
                <tbody>
                  {job.parts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.part_name} ({p.part_number})</td>
                      <td>{p.warranty_expires_at ? `Till ${dateOnly(p.warranty_expires_at)}` : (p.warranty_months ? `${p.warranty_months} mo` : '-')}</td>
                      <td>{p.quantity}</td>
                      <td>{money(p.unit_price)}</td>
                      <td>{money(p.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">No parts issued yet</div>}
          </Card>

          <Card title="Labour charges" actions={<Button size="btn-sm" onClick={() => setLabourModal(true)}>+ Add labour</Button>}>
            {job.labourCharges?.length ? (
              <table className="table">
                <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                <tbody>
                  {job.labourCharges.map((l) => (
                    <tr key={l.id}><td>{l.description}</td><td>{money(l.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">No labour charges yet</div>}
          </Card>
        </div>

        <div>
          <Card title="Repair notes" actions={<Button size="btn-sm" onClick={() => setNoteModal(true)}>+ Add note</Button>}>
            {job.notes?.length ? (
              <div className="note-stack">
                {job.notes.map((n) => (
                  <div className="note" key={n.id}>
                    <div>{n.note}</div>
                    <small>{n.user_name || 'Staff'} · {dateOnly(n.created_at)}</small>
                  </div>
                ))}
              </div>
            ) : <div className="empty">No notes yet</div>}
          </Card>
        </div>
      </div>

      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="Add repair note">
        <form onSubmit={addNote} className="form-grid">
          <Field label="Note" ><textarea required className="full" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setNoteModal(false)}>Cancel</Button>
            <Button disabled={busy}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={partModal} onClose={() => setPartModal(false)} title="Issue part to this job">
        <form onSubmit={addPart} className="form-grid">
          <Field label="Part" >
            <select required value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)}>
              <option value="">Select part</option>
              {deductable.map((p) => <option key={p.id} value={p.id}>{p.name} — stock {p.quantity} · {money(p.selling_price)}</option>)}
            </select>
          </Field>
          <Field label="Quantity"><input type="number" min="1" required value={partQty} onChange={(e) => setPartQty(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setPartModal(false)}>Cancel</Button>
            <Button disabled={busy}>Issue part</Button>
          </div>
        </form>
      </Modal>

      <Modal open={labourModal} onClose={() => setLabourModal(false)} title="Add labour charge">
        <form onSubmit={addLabour} className="form-grid">
          <Field label="Description" ><input required value={labDesc} onChange={(e) => setLabDesc(e.target.value)} /></Field>
          <Field label="Amount" ><input type="number" min="0" step="0.01" required value={labAmount} onChange={(e) => setLabAmount(e.target.value)} /></Field>
          <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setLabourModal(false)}>Cancel</Button>
            <Button disabled={busy}>Add</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}