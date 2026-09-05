import React from 'react';

export function Button({ variant = 'primary', size, children, ...props }) {
  return (
    <button className={`btn btn-${variant} ${size ? `btn-${size}` : ''}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function Badge({ color = 'gray', children }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function statusColor(status) {
  return {
    received: 'blue',
    checking: 'purple',
    waiting_parts: 'amber',
    repairing: 'orange',
    completed: 'green',
    delivered: 'teal',
    paid: 'green',
    partial: 'amber',
    unpaid: 'red',
    approved: 'green',
    pending: 'amber',
    rejected: 'red',
    draft: 'gray',
    converted: 'teal',
  }[status] || 'gray';
}

export function StatusBadge({ status }) {
  return <Badge color={statusColor(status)}>{status?.replace(/_/g, ' ')}</Badge>;
}

export function Field({ label, children, required }) {
  return (
    <label className="field">
      <span>
        {label} {required && <em>*</em>}
      </span>
      {children}
    </label>
  );
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty = 'No records' }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c, j) => (
                <td key={j}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Loading({ text = 'Loading...' }) {
  return <div className="center muted">{text}</div>;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="alert alert-error">{message}</div>;
}

export function SuccessBox({ message }) {
  if (!message) return null;
  return <div className="alert alert-success">{message}</div>;
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return <input className="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function EmptyState({ icon = '🗂️', title = 'Nothing here yet', subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}