// Web user management - Backoffice creates Backoffice and Grid Operator accounts.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const emptyForm = { fullName: '', email: '', phoneNumber: '', role: 'GridOperator', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Loads the two web roles, leaving prosumers to their own screen.
  async function load() {
    setError('');
    try {
      const [backoffice, operators] = await Promise.all([
        api.get('/api/users?role=Backoffice'),
        api.get('/api/users?role=GridOperator'),
      ]);
      setUsers([...backoffice, ...operators]);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Creates a web user through the API.
  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/api/users', form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="h4 mb-4">Web Users</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-muted mb-3">Create a Backoffice or Grid Operator account</h2>
          <form className="row g-2" onSubmit={handleCreate}>
            <div className="col-12 col-lg-3">
              <input
                className="form-control"
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="col-12 col-lg-3">
              <input
                className="form-control"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="col-6 col-lg-2">
              <input
                className="form-control"
                placeholder="Phone"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </div>
            <div className="col-6 col-lg-2">
              <select
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="GridOperator">Grid Operator</option>
                <option value="Backoffice">Backoffice</option>
              </select>
            </div>
            <div className="col-12 col-lg-2">
              <input
                className="form-control"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="col-12">
              <button className="btn btn-warning btn-sm fw-semibold">Create user</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold">{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge text-bg-light border">{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No web users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
