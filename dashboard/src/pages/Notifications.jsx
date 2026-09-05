import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Table, Loading, ErrorBox, Badge } from '../components/ui';
import { dateTime } from '../utils/format';

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/notifications', { params: { limit: 100 } })
      .then((res) => setRows(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Notifications</h2>
      <p className="muted">
        Push / SMS / WhatsApp messages sent to customers during the repair workflow.
        Providers (Firebase Cloud Messaging, Twilio, WhatsApp Business API) plug into the backend
        notification service via environment variables.
      </p>
      <Card>
        {loading ? <Loading /> : (
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'message', label: 'Message' },
              { label: 'Channel', render: (r) => <Badge color="blue">{r.channels}</Badge> },
              { label: 'Status', render: (r) => <Badge color={r.status === 'sent' ? 'green' : 'amber'}>{r.status}</Badge> },
              { label: 'Sent', render: (r) => (r.sent_at ? dateTime(r.sent_at) : '-') },
            ]}
            rows={rows}
          />
        )}
      </Card>
    </>
  );
}