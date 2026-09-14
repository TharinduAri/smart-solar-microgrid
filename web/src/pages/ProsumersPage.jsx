// Prosumer management - approves pending activations and deactivates accounts.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function ProsumersPage() {
  const [prosumers, setProsumers] = useState([]);
  const [error, setError] = useState('');

  // Loads every prosumer account registered from the mobile application.
  async function load() {
    setError('');
    try {
      setProsumers(await api.get('/api/users?role=Prosumer'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Activates or deactivates an account - reactivation is Backoffice only.
  async function setActive(prosumer, active) {
    setError('');
    try {
      await api.patch(`/api/users/${prosumer.id}/${active ? 'activate' : 'deactivate'}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const pending = prosumers.filter((p) => !p.isActive);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">Prosumers</h1>
        {pending.length > 0 && (
          <span className="badge text-bg-warning">{pending.length} awaiting activation</span>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>NIC</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {prosumers.map((p) => (
                <tr key={p.id}>
                  <td className="fw-semibold">{p.nic}</td>
                  <td>{p.fullName}</td>
                  <td>{p.email}</td>
                  <td>{p.phoneNumber ?? '-'}</td>
                  <td>
                    {p.isActive ? (
                      <span className="badge text-bg-success">Active</span>
                    ) : (
                      <span className="badge text-bg-warning">Pending / Inactive</span>
                    )}
                    {p.deactivationRequested && (
                      <span className="badge text-bg-danger ms-1">Deactivation requested</span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className={`btn btn-sm ${p.isActive ? 'btn-outline-danger' : 'btn-warning'}`}
                      onClick={() => setActive(p, !p.isActive)}
                    >
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {prosumers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No prosumer accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODO: add an edit profile modal for Backoffice corrections. */}
    </>
  );
}
