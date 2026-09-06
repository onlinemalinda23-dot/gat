import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Button, Field, Loading, ErrorBox, SuccessBox } from '../components/ui';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  
  const [form, setForm] = useState({
    text_lk_api_token: '',
    text_lk_sender_id: '',
  });

  function load() {
    setLoading(true);
    api.get('/settings')
      .then((res) => {
        setForm({
          text_lk_api_token: res.data.data.text_lk_api_token || '',
          text_lk_sender_id: res.data.data.text_lk_sender_id || '',
        });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api.put('/settings', form);
      setOk('Settings saved successfully');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Settings</h2>
      </div>
      <SuccessBox message={ok} />
      <ErrorBox message={error} />
      <Card title="SMS Configuration (Text.lk)">
        {loading ? <Loading /> : (
          <form onSubmit={save} className="form-grid">
            <Field label="Text.lk API Token">
              <input 
                type="text" 
                value={form.text_lk_api_token} 
                onChange={(e) => setForm({ ...form, text_lk_api_token: e.target.value })} 
                placeholder="Enter API Token"
              />
            </Field>
            <Field label="Sender ID">
              <input 
                type="text" 
                value={form.text_lk_sender_id} 
                onChange={(e) => setForm({ ...form, text_lk_sender_id: e.target.value })} 
                placeholder="e.g. GRAND_AUTO"
              />
            </Field>
            
            <div className="full" style={{ display: 'flex', gap: 8, justifyContent: 'flex-start', marginTop: 16 }}>
              <Button disabled={busy}>{busy ? 'Saving...' : 'Save Settings'}</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
