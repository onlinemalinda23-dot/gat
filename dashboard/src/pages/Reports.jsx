import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Table, Loading, ErrorBox } from '../components/ui';
import { money } from '../utils/format';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', { month: 'long' }) }));

export default function Reports() {
  const now = new Date();
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/reports/daily'),
      api.get('/reports/monthly', { params: { year, month } }),
    ])
      .then(([d, m]) => { setDaily(d.data.data); setMonthly(m.data.data); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const sales = monthly?.sales || {};
  const stocks = monthly?.stockStatus || [];
  const lowCount = stocks.filter((s) => s.low_stock).length;

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Reports</h2>

      <div className="stats">
        <div className="stat accent"><div className="stat-label">Jobs today</div><div className="stat-value">{daily?.jobs?.total_jobs ?? 0}</div></div>
        <div className="stat accent"><div className="stat-label">Income today</div><div className="stat-value">{money(daily?.income)}</div></div>
        <div className="stat"><div className="stat-label">Expenses today</div><div className="stat-value">{money(daily?.expenses)}</div></div>
        <div className="stat"><div className="stat-label">Profit today</div><div className="stat-value">{money(daily?.profit)}</div></div>
      </div>

      <div className="panel">
        <h3 style={{ margin: 0 }}>Monthly report</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </div>
      </div>

      <div className="grid-2">
        <Card title="Most repaired vehicle models">
          <Table columns={[
            { label: 'Model', render: (r) => `${r.brand} ${r.model}` },
            { key: 'repair_count', label: 'Repairs' },
          ]} rows={monthly?.topRepairedModels || []} />
        </Card>
        <Card title="Most used parts">
          <Table columns={[
            { key: 'name', label: 'Part' },
            { key: 'total_used', label: 'Units used' },
            { label: 'Value', render: (r) => money(r.total_cost) },
          ]} rows={monthly?.topUsedParts || []} />
        </Card>
      </div>

      <Card title="Sales summary">
        <div className="grid-2">
          <div className="kv"><span>Total revenue</span><strong>{money(sales.total_revenue)}</strong></div>
          <div className="kv"><span>Total discounts</span><strong>{money(sales.total_discounts)}</strong></div>
          <div className="kv"><span>Invoices</span><strong>{sales.total_invoices ?? 0}</strong></div>
          <div className="kv"><span>Purchases (expenses)</span><strong>{money(monthly?.expenses)}</strong></div>
          <div className="kv"><span>Paid</span><strong>{sales.paid ?? 0}</strong></div>
          <div className="kv"><span>Unpaid / partial</span><strong>{sales.unpaid ?? 0} / {sales.partial ?? 0}</strong></div>
        </div>
      </Card>

      <Card title={`Stock report (${lowCount} low) — non-zero stock shown`}>
        <Table columns={[
          { key: 'name', label: 'Part' },
          { key: 'part_number', label: 'Part No' },
          { key: 'quantity', label: 'Stock' },
          { label: 'Status', render: (r) => <span className={`badge badge-${r.low_stock ? 'red' : 'green'}`}>{r.low_stock ? 'Low' : 'Ok'}</span> },
          { key: 'supplier_name', label: 'Supplier' },
        ]} rows={stocks} />
      </Card>
    </>
  );
}