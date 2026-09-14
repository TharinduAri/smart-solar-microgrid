// Energy slot reservation management - search, approve and cancel bookings.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const STATUSES = ['', 'Pending', 'Approved', 'Completed', 'Cancelled'];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ nic: '', status: '' });
  const [error, setError] = useState('');

  // Builds the query string from the filter inputs and reloads the list.
  const load = useCallback(async () => {
    setError('');
    const query = new URLSearchParams();
    if (filters.nic) query.set('nic', filters.nic);
    if (filters.status) query.set('status', filters.status);
    try {
      setReservations(await api.get(`/api/reservations?${query.toString()}`));
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Approves a pending booking, which makes the API issue the QR token.
  async function approve(id) {
    setError('');
    try {
      await api.patch(`/api/reservations/${id}/approve`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Cancels a booking; the 12 hour notice rule is enforced by the API.
  async function cancel(id) {
    setError('');
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="h4 mb-4">Energy Slot Reservations</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted">Prosumer NIC</label>
              <input
                className="form-control"
                value={filters.nic}
                onChange={(e) => setFilters({ ...filters, nic: e.target.value })}
                placeholder="Search by NIC"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || 'All statuses'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Prosumer</th>
                <th>Node</th>
                <th>Reservation time</th>
                <th>Energy</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold">{r.prosumerName}</div>
                    <div className="small text-muted">{r.prosumerNic}</div>
                  </td>
                  <td>{r.stationName}</td>
                  <td>{new Date(r.reservationTime).toLocaleString()}</td>
                  <td>{r.energyKwh} kWh</td>
                  <td>
                    <span className="badge text-bg-light border">{r.status}</span>
                  </td>
                  <td className="text-end">
                    {r.status === 'Pending' && (
                      <button className="btn btn-sm btn-warning me-1" onClick={() => approve(r.id)}>
                        Approve
                      </button>
                    )}
                    {(r.status === 'Pending' || r.status === 'Approved') && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(r.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No reservations match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODO: add a create/update reservation modal for the Grid Operator. */}
    </>
  );
}
