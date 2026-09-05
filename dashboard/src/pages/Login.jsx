import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/api';
import { ErrorBox } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>🔩 AutoWorks Repair Manager</h1>
        <p className="sub">Sign in to the workshop admin panel</p>
        <ErrorBox message={error} />
        <form onSubmit={handleSubmit}>
          <div className="field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@workshop.com" />
          </div>
          <div className="field">
            <span>Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
          Default admin: admin@workshop.com / Admin@123 (after seeding)
        </p>
      </div>
    </div>
  );
}