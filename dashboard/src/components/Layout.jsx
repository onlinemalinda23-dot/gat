import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  ['/', 'Dashboard', '📊'],
  ['/appointments', 'Appointments', '📅'],
  ['/customers', 'Customers', '👥'],
  ['/vehicles', 'Vehicles', '🚗'],
  ['/job-cards', 'Job Cards', '📋'],
  ['/parts', 'Parts & Stock', '🔧'],
  ['/inventory', 'Inventory', '🗃️'],
  ['/suppliers', 'Suppliers', '🏭'],
  ['/purchases', 'Purchases', '📦'],
  ['/estimates', 'Estimates', '🧾'],
  ['/invoices', 'Invoices', '💳'],
  ['/payments', 'Payments', '💵'],
  ['/notifications', 'Notifications', '🔔'],
  ['/reports', 'Reports', '📈'],
  ['/users', 'Employees', '👷'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={`layout ${open ? 'sidebar-open' : ''}`}>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)}></div>}
      <aside className="sidebar">
        <div className="brand">
          <img src="./logo.jpg" alt="Logo" className="brand-logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />
          <div>
            <strong>Grand Auto Tech</strong>
            <small>(pvt) Ltd</small>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')} end={to === '/'} onClick={() => setOpen(false)}>
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="burger" onClick={() => setOpen(!open)}>☰</button>
          <div className="spacer" />
          <div className="user-chip">
            <div>
              <strong>{user?.full_name}</strong>
              <small>{user?.role}</small>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}