import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Table, StatusBadge, Loading, ErrorBox } from '../components/ui';
import { dateTime, dateOnly, money, ucFirst } from '../utils/format';

export default function Dashboard() {
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/daily'),
      api.get('/reports/monthly'),
      api.get('/parts/low-stock'),
      api.get('/job-cards?limit=8'),
    ])
      .then(([d, m, l, j]) => {
        setDaily(d.data.data);
        setMonthly(m.data.data);
        setLowStock(l.data.data);
        setJobCards(j.data.data);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const sales = monthly?.sales || {};
  const dailyBreakdown = monthly?.dailyBreakdown || [];
  const maxIncome = Math.max(1, ...dailyBreakdown.map((d) => Number(d.income)));

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div className="stats">
        <div className="stat accent">
          <div className="stat-label">Jobs today</div>
          <div className="stat-value">{daily?.jobs?.total_jobs ?? 0}</div>
          <div className="stat-sub">{daily?.jobs?.in_progress ?? 0} in progress</div>
        </div>
        <div className="stat accent">
          <div className="stat-label">Income today</div>
          <div className="stat-value">{money(daily?.income)}</div>
          <div className="stat-sub">Expenses {money(daily?.expenses)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Revenue this month</div>
          <div className="stat-value">{money(sales.total_revenue)}</div>
          <div className="stat-sub">{sales.total_invoices ?? 0} invoices</div>
        </div>
        <div className="stat">
          <div className="stat-label">Low stock items</div>
          <div className="stat-value" style={{ color: lowStock.length > 0 ? 'var(--red)' : undefined }}>
            {lowStock.length}
          </div>
          <div className="stat-sub">need reordering</div>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Recent job cards">
          <Table
            columns={[
              { key: 'job_card_number', label: 'Number' },
              { key: 'customer_name', label: 'Customer' },
              { label: 'Vehicle', render: (r) => `${r.brand} ${r.model}` },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Received', render: (r) => dateOnly(r.received_at) },
            ]}
            rows={jobCards}
          />
        </Card>

        <Card title="This month's income by day">
          {dailyBreakdown.length === 0 ? (
            <div className="empty">No data for this month yet</div>
          ) : (
            <div className="bar-chart" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dailyBreakdown.map((d) => (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 80, fontSize: 12 }}>{dateOnly(d.day)}</span>
                  <div style={{ flex: 1, height: 18, background: '#eef2ff', borderRadius: 4 }}>
                    <div
                      style={{
                        width: `${(Number(d.income) / maxIncome) * 100}%`,
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ width: 80, textAlign: 'right', fontSize: 12 }}>{money(d.income)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Low stock warning" actions={<span className="muted">{ucFirst('reorder soon')}</span>}>
        <Table
          columns={[
            { key: 'name', label: 'Part' },
            { key: 'part_number', label: 'Part No' },
            { key: 'category', label: 'Category' },
            { key: 'quantity', label: 'Stock' },
            { key: 'low_stock_threshold', label: 'Threshold' },
            { label: 'Supplier', render: (r) => r.supplier_name || '-' },
          ]}
          rows={lowStock}
        />
      </Card>
    </>
  );
}