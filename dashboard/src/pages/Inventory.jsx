import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';
import { Card, Table, Loading, ErrorBox, Badge } from '../components/ui';
import { money } from '../utils/format';

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/parts', { params: { limit: 200 } }),
      api.get('/parts/low-stock'),
    ])
      .then(([p, low]) => { setRows(p.data.data); setLowStock(low.data.data); })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const totalUnits = rows.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const stockValue = rows.reduce((s, p) => s + Number(p.quantity || 0) * Number(p.purchase_price || 0), 0);
  const lowCount = rows.filter((p) => Number(p.quantity) <= Number(p.low_stock_threshold || 0)).length;

  return (
    <>
      <div className="panel">
        <h2 style={{ margin: 0 }}>Inventory</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Live stock levels from the parts table</p>
      </div>
      <ErrorBox message={error} />

      <div className="stats">
        <Card className="stat">
          <div className="stat-value">{rows.length}</div>
          <div className="stat-label">SKUs tracked</div>
        </Card>
        <Card className="stat">
          <div className="stat-value">{totalUnits}</div>
          <div className="stat-label">Units in stock</div>
        </Card>
        <Card className="stat">
          <div className="stat-value" style={{ color: lowCount > 0 ? '#d33' : '#1a7f37' }}>{lowCount}</div>
          <div className="stat-label">Low stock parts</div>
        </Card>
        <Card className="stat">
          <div className="stat-value">{money(stockValue)}</div>
          <div className="stat-label">Stock value (cost)</div>
        </Card>
      </div>

      <Card title="Low stock alert" actions={lowStock.length > 0 && <Badge color="red">{lowStock.length} need restocking</Badge>}>
        {loading ? <Loading /> : (
          lowStock.length > 0 ? (
            <Table
              columns={[
                { label: 'Part', render: (r) => `${r.name}` },
                { key: 'part_number', label: 'Part No.' },
                { label: 'Supplier', render: (r) => r.supplier_name || '—' },
                { label: 'In stock', render: (r) => <strong>{r.quantity}</strong> },
                { key: 'low_stock_threshold', label: 'Threshold' },
                { label: 'Status', render: (r) => <Badge color={Number(r.quantity) <= 0 ? 'red' : 'amber'}>{Number(r.quantity) <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}</Badge> },
              ]}
              rows={lowStock}
              empty="All parts are above their reorder threshold"
            />
          ) : (
            <div className="good-banner">All parts are above their reorder thresholds</div>
          )
        )}
      </Card>

      <Card title="All stock levels">
        {loading ? <Loading /> : (
          <Table
            columns={[
              { label: 'Part', render: (r) => r.name },
              { key: 'part_number', label: 'Part No.' },
              { key: 'category', label: 'Category', render: (r) => r.category || '—' },
              { label: 'Supplier', render: (r) => r.supplier_name || '—' },
              { label: 'In stock', render: (r) => <strong>{r.quantity}</strong> },
              { key: 'low_stock_threshold', label: 'Threshold' },
              { label: 'Unit cost', render: (r) => money(r.purchase_price) },
              { label: 'Status', render: (r) => (
                  Number(r.quantity) <= 0 ? <Badge color="red">OUT OF STOCK</Badge>
                  : Number(r.quantity) <= Number(r.low_stock_threshold || 0) ? <Badge color="amber">LOW</Badge>
                  : <Badge color="green">OK</Badge>
                ) },
            ]}
            rows={rows}
            empty="No parts in inventory yet"
          />
        )}
      </Card>

      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Inventory is updated automatically by the API: issuing a part to a job card deducts stock, and recording a purchase increases it.
      </p>
    </>
  );
}