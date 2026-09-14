// Login screen. Sends the credentials to /api/auth/login and routes on the role.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Submits the credentials and blocks prosumers, who belong on the mobile app.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(username, password);
      if (result.role === 'Prosumer') {
        setError('Prosumer accounts must sign in through the mobile application.');
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ss-login-shell">
      <div className="card shadow-lg border-0" style={{ width: 'min(420px, 92vw)' }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="bi bi-sun-fill display-5 text-warning" />
            <h1 className="h4 mt-2 mb-1">Smart Solar Microgrid</h1>
            <p className="text-muted small mb-0">Backoffice &amp; Grid Operator portal</p>
          </div>

          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email or NIC</label>
              <input
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-warning w-100 fw-semibold" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
