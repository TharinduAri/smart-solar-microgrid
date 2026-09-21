// Prosumer management - approves pending activations, edits profiles, and handles deactivations.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function ProsumersPage() {
  const [prosumers, setProsumers] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // all | pending | active | deactivationRequested
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProsumer, setEditingProsumer] = useState(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');
    try {
      await api.patch(`/api/users/${prosumer.id}/${active ? 'activate' : 'deactivate'}`);
      setSuccess(`Account ${prosumer.nic} (${prosumer.fullName}) ${active ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Updates prosumer profile details (name, email, phone, address).
  async function handleUpdateProfile(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.put(`/api/users/${editingProsumer.id}`, {
        fullName: editingProsumer.fullName.trim(),
        email: editingProsumer.email.trim(),
        phoneNumber: editingProsumer.phoneNumber?.trim() || null,
        address: editingProsumer.address?.trim() || null,
      });
      setEditingProsumer(null);
      setSuccess('Prosumer profile updated successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  const pendingCount = prosumers.filter((p) => !p.isActive).length;
  const deactivationCount = prosumers.filter((p) => p.deactivationRequested).length;

  const filteredProsumers = prosumers.filter((p) => {
    if (filterTab === 'pending' && p.isActive) return false;
    if (filterTab === 'active' && !p.isActive) return false;
    if (filterTab === 'deactivationRequested' && !p.deactivationRequested) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNic = p.nic?.toLowerCase().includes(q);
      const matchesName = p.fullName?.toLowerCase().includes(q);
      const matchesEmail = p.email?.toLowerCase().includes(q);
      return matchesNic || matchesName || matchesEmail;
    }
    return true;
  });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-0">Solar Prosumer Accounts</h1>
          <div className="text-muted small">
            Prosumers register via mobile using their National Identity Card (NIC)
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show">{error}</div>}
      {success && <div className="alert alert-success alert-dismissible fade show">{success}</div>}

      {/* Tabs & Search Filter */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <ul className="nav nav-pills">
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 ${filterTab === 'all' ? 'active bg-warning text-dark fw-semibold' : 'text-dark'}`}
                    onClick={() => setFilterTab('all')}
                  >
                    All ({prosumers.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 ${filterTab === 'pending' ? 'active bg-warning text-dark fw-semibold' : 'text-dark'}`}
                    onClick={() => setFilterTab('pending')}
                  >
                    Pending Activation
                    {pendingCount > 0 && (
                      <span className="badge bg-danger ms-2">{pendingCount}</span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link py-1 px-3 ${filterTab === 'active' ? 'active bg-warning text-dark fw-semibold' : 'text-dark'}`}
                    onClick={() => setFilterTab('active')}
                  >
                    Active ({prosumers.filter((p) => p.isActive).length})
                  </button>
                </li>
                {deactivationCount > 0 && (
                  <li className="nav-item">
                    <button
                      className={`nav-link py-1 px-3 ${filterTab === 'deactivationRequested' ? 'active bg-warning text-dark fw-semibold' : 'text-danger'}`}
                      onClick={() => setFilterTab('deactivationRequested')}
                    >
                      Deactivation Requests ({deactivationCount})
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div className="col-12 col-md-4">
              <input
                className="form-control form-control-sm"
                placeholder="Search by NIC, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>NIC (Primary Key)</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProsumers.map((p) => (
                <tr key={p.id}>
                  <td className="fw-semibold font-monospace">{p.nic}</td>
                  <td>{p.fullName}</td>
                  <td>{p.email}</td>
                  <td>{p.phoneNumber ?? '—'}</td>
                  <td className="small text-muted">{p.address ?? '—'}</td>
                  <td>
                    {p.isActive ? (
                      <span className="badge text-bg-success">Active</span>
                    ) : (
                      <span className="badge text-bg-warning">Pending Activation</span>
                    )}
                    {p.deactivationRequested && (
                      <span className="badge text-bg-danger ms-1">Deactivation Requested</span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-secondary me-1"
                      onClick={() => setEditingProsumer({ ...p })}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${p.isActive ? 'btn-outline-danger' : 'btn-warning fw-semibold'}`}
                      onClick={() => setActive(p, !p.isActive)}
                    >
                      {p.isActive ? 'Deactivate' : 'Activate Account'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProsumers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No prosumer accounts found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Prosumer Modal */}
      {editingProsumer && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Edit Prosumer Profile</h5>
                <button type="button" className="btn-close" onClick={() => setEditingProsumer(null)} />
              </div>
              <form onSubmit={handleUpdateProfile}>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}

                  <div className="mb-3">
                    <label className="form-label small text-muted">NIC (Read Only)</label>
                    <input className="form-control font-monospace" value={editingProsumer.nic} disabled />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Full Name</label>
                    <input
                      className="form-control"
                      value={editingProsumer.fullName}
                      onChange={(e) => setEditingProsumer({ ...editingProsumer, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingProsumer.email}
                      onChange={(e) => setEditingProsumer({ ...editingProsumer, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Phone Number</label>
                    <input
                      className="form-control"
                      value={editingProsumer.phoneNumber ?? ''}
                      onChange={(e) => setEditingProsumer({ ...editingProsumer, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Address</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      value={editingProsumer.address ?? ''}
                      onChange={(e) => setEditingProsumer({ ...editingProsumer, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setEditingProsumer(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-semibold">
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
