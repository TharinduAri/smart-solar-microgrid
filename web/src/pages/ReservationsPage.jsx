// Energy slot reservation management - search, create, update, approve and cancel bookings.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const STATUSES = ['', 'Pending', 'Approved', 'Completed', 'Cancelled'];

const emptyCreateForm = {
  prosumerNic: '',
  stationId: '',
  slotId: '',
  energyKwh: '',
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [stations, setStations] = useState([]);
  const [filters, setFilters] = useState({ nic: '', status: '', stationId: '', upcoming: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createSlots, setCreateSlots] = useState([]);
  const [modalError, setModalError] = useState('');

  // Update Modal State
  const [editingReservation, setEditingReservation] = useState(null);
  const [updateSlots, setUpdateSlots] = useState([]);
  const [updateForm, setUpdateForm] = useState({ slotId: '', energyKwh: '' });

  // QR Display State
  const [viewingQr, setViewingQr] = useState(null);

  // Loads stations for the filter and create dialogs
  useEffect(() => {
    api
      .get('/api/stations?isActive=true')
      .then(setStations)
      .catch((err) => setError(err.message));
  }, []);

  // Builds query string from filters and fetches reservations
  const load = useCallback(async () => {
    setError('');
    const query = new URLSearchParams();
    if (filters.nic) query.set('nic', filters.nic);
    if (filters.status) query.set('status', filters.status);
    if (filters.stationId) query.set('stationId', filters.stationId);
    if (filters.upcoming) query.set('upcoming', filters.upcoming);

    try {
      setReservations(await api.get(`/api/reservations?${query.toString()}`));
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Loads slots when a station is chosen in the Create modal
  async function handleCreateStationChange(stationId) {
    setCreateForm({ ...createForm, stationId, slotId: '' });
    setCreateSlots([]);
    if (!stationId) return;
    try {
      const slots = await api.get(`/api/stations/${stationId}/slots?availableOnly=true`);
      setCreateSlots(slots);
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Submits a new reservation through the API
  async function handleCreateSubmit(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.post('/api/reservations', {
        prosumerNic: createForm.prosumerNic.trim().toUpperCase(),
        stationId: createForm.stationId,
        slotId: createForm.slotId,
        energyKwh: Number(createForm.energyKwh),
      });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      setCreateSlots([]);
      setSuccess('Reservation created successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Opens the update modal and loads slots for the reservation's station
  async function openUpdateModal(reservation) {
    setEditingReservation(reservation);
    setModalError('');
    setUpdateForm({
      slotId: reservation.slotId,
      energyKwh: reservation.energyKwh,
    });
    try {
      const slots = await api.get(`/api/stations/${reservation.stationId}/slots?availableOnly=false`);
      setUpdateSlots(slots);
    } catch (err) {
      setError(err.message);
    }
  }

  // Submits an update / reschedule (API checks the 12 hour rule)
  async function handleUpdateSubmit(e) {
    e.preventDefault();
    setModalError('');
    try {
      await api.put(`/api/reservations/${editingReservation.id}`, {
        slotId: updateForm.slotId,
        energyKwh: Number(updateForm.energyKwh),
      });
      setEditingReservation(null);
      setSuccess('Reservation updated successfully.');
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  // Approves a pending booking, which makes the API issue the QR token
  async function approve(id) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/reservations/${id}/approve`);
      setSuccess('Reservation approved and QR token generated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Cancels a booking; 12 hour notice rule enforced by API
  async function cancel(id) {
    if (!window.confirm('Are you sure you want to cancel this reservation? (Requires at least 12 hours notice)')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/reservations/${id}/cancel`);
      setSuccess('Reservation cancelled and slot capacity restored.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">Energy Slot Reservations</h1>
        <button className="btn btn-warning fw-semibold btn-sm" onClick={() => setShowCreateModal(true)}>
          <i className="bi bi-plus-circle me-1" />
          New Reservation
        </button>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show">{error}</div>}
      {success && <div className="alert alert-success alert-dismissible fade show">{success}</div>}

      {/* Filter Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Prosumer NIC</label>
              <input
                className="form-control"
                value={filters.nic}
                onChange={(e) => setFilters({ ...filters, nic: e.target.value })}
                placeholder="Search by NIC"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Microgrid Node</label>
              <select
                className="form-select"
                value={filters.stationId}
                onChange={(e) => setFilters({ ...filters, stationId: e.target.value })}
              >
                <option value="">All Stations</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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
            <div className="col-12 col-md-3">
              <label className="form-label small text-muted">Timeline</label>
              <select
                className="form-select"
                value={filters.upcoming}
                onChange={(e) => setFilters({ ...filters, upcoming: e.target.value })}
              >
                <option value="">All Bookings</option>
                <option value="true">Upcoming Only</option>
                <option value="false">Past History</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Prosumer</th>
                <th>Node</th>
                <th>Reservation Time</th>
                <th>Energy (kWh)</th>
                <th>Status</th>
                <th>QR Token</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const isActionable = r.status === 'Pending' || r.status === 'Approved';
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-semibold">{r.prosumerName}</div>
                      <div className="small text-muted">{r.prosumerNic}</div>
                    </td>
                    <td>{r.stationName}</td>
                    <td>{new Date(r.reservationTime).toLocaleString()}</td>
                    <td>{r.energyKwh} kWh</td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'Approved'
                            ? 'text-bg-success'
                            : r.status === 'Pending'
                            ? 'text-bg-warning'
                            : r.status === 'Completed'
                            ? 'text-bg-info'
                            : 'text-bg-secondary'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.qrToken ? (
                        <button
                          className="btn btn-sm btn-outline-dark font-monospace py-0 px-2"
                          onClick={() => setViewingQr(r)}
                          title="View QR Token"
                        >
                          <i className="bi bi-qr-code me-1" />
                          {r.qrToken.slice(0, 8)}...
                        </button>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      {r.status === 'Pending' && (
                        <button className="btn btn-sm btn-warning me-1" onClick={() => approve(r.id)}>
                          Approve
                        </button>
                      )}
                      {isActionable && (
                        <button
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => openUpdateModal(r)}
                          title="Reschedule or edit energy"
                        >
                          Edit
                        </button>
                      )}
                      {isActionable && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(r.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No reservations match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Reservation Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Book Energy Trading Slot</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}

                  <div className="mb-3">
                    <label className="form-label small text-muted">Prosumer NIC</label>
                    <input
                      className="form-control"
                      placeholder="e.g. 198512345678"
                      value={createForm.prosumerNic}
                      onChange={(e) => setCreateForm({ ...createForm, prosumerNic: e.target.value })}
                      required
                    />
                    <div className="form-text small">Account must be active in the system.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Microgrid Node</label>
                    <select
                      className="form-select"
                      value={createForm.stationId}
                      onChange={(e) => handleCreateStationChange(e.target.value)}
                      required
                    >
                      <option value="">Select a microgrid station...</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Booking Time Window (Within 7 Days)</label>
                    <select
                      className="form-select"
                      value={createForm.slotId}
                      onChange={(e) => setCreateForm({ ...createForm, slotId: e.target.value })}
                      disabled={!createForm.stationId}
                      required
                    >
                      <option value="">
                        {createForm.stationId ? 'Select available slot...' : 'Choose a station first'}
                      </option>
                      {createSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {new Date(slot.startTime).toLocaleDateString()} (
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) —{' '}
                          {slot.availableSlots} free bays
                        </option>
                      ))}
                    </select>
                    {createForm.stationId && createSlots.length === 0 && (
                      <div className="form-text text-danger small">No open slots available for this station.</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Energy to Trade (kWh)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g. 15.0"
                      className="form-control"
                      value={createForm.energyKwh}
                      onChange={(e) => setCreateForm({ ...createForm, energyKwh: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-semibold">
                    Submit Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update / Reschedule Reservation Modal */}
      {editingReservation && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Reschedule / Edit Reservation</h5>
                <button type="button" className="btn-close" onClick={() => setEditingReservation(null)} />
              </div>
              <form onSubmit={handleUpdateSubmit}>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
                  <div className="alert alert-info py-2 small">
                    <i className="bi bi-info-circle me-1" />
                    Updates require at least 12 hours notice prior to the scheduled window.
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Prosumer</label>
                    <input
                      className="form-control"
                      value={`${editingReservation.prosumerName} (${editingReservation.prosumerNic})`}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Microgrid Node</label>
                    <input className="form-control" value={editingReservation.stationName} disabled />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Time Slot Window</label>
                    <select
                      className="form-select"
                      value={updateForm.slotId}
                      onChange={(e) => setUpdateForm({ ...updateForm, slotId: e.target.value })}
                      required
                    >
                      {updateSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {new Date(slot.startTime).toLocaleDateString()} (
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) —{' '}
                          {slot.id === editingReservation.slotId ? 'Current slot' : `${slot.availableSlots} free bays`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Energy (kWh)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="form-control"
                      value={updateForm.energyKwh}
                      onChange={(e) => setUpdateForm({ ...updateForm, energyKwh: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setEditingReservation(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-semibold">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Token Modal */}
      {viewingQr && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content border-0 shadow text-center">
              <div className="modal-header">
                <h5 className="modal-title w-100">Transaction Token</h5>
                <button type="button" className="btn-close" onClick={() => setViewingQr(null)} />
              </div>
              <div className="modal-body py-4">
                <div className="p-3 bg-light rounded d-inline-block mb-3 border">
                  <i className="bi bi-qr-code display-4 text-dark" />
                </div>
                <h6 className="fw-semibold mb-1">{viewingQr.prosumerName}</h6>
                <div className="text-muted small mb-3">{viewingQr.stationName}</div>
                <div className="alert alert-secondary font-monospace small mb-0 select-all">
                  {viewingQr.qrToken}
                </div>
                <div className="text-muted small mt-2">
                  Scanned by Grid Operator on-site to verify and complete energy transfer.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm w-100" onClick={() => setViewingQr(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
