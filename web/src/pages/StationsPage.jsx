// Microgrid node management - lists nodes, edits nodes, manages slots, and handles lifecycle.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyStationForm = { name: '', location: '', latitude: '', longitude: '', capacityKwh: '', totalSlots: '' };
const emptySlotForm = { startTime: '', endTime: '', totalSlots: '' };

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [createForm, setCreateForm] = useState(emptyStationForm);
  const [editingStation, setEditingStation] = useState(null);
  const [selectedStationForSlots, setSelectedStationForSlots] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [error, setError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [success, setSuccess] = useState('');
  const { isBackoffice } = useAuth();

  // Reloads the node list from the Web API.
  async function load() {
    try {
      setStations(await api.get('/api/stations'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Creates a node from the inline form.
  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/stations', {
        name: createForm.name,
        location: createForm.location,
        latitude: Number(createForm.latitude),
        longitude: Number(createForm.longitude),
        capacityKwh: Number(createForm.capacityKwh),
        totalSlots: Number(createForm.totalSlots),
      });
      setCreateForm(emptyStationForm);
      setSuccess('Microgrid node registered successfully.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Updates an existing node.
  async function handleUpdateStation(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`/api/stations/${editingStation.id}`, {
        name: editingStation.name,
        location: editingStation.location,
        latitude: Number(editingStation.latitude),
        longitude: Number(editingStation.longitude),
        capacityKwh: Number(editingStation.capacityKwh),
        totalSlots: Number(editingStation.totalSlots),
      });
      setEditingStation(null);
      setSuccess('Node updated successfully.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Deletes a node if no active reservations exist.
  async function handleDeleteStation(station) {
    if (!window.confirm(`Are you sure you want to delete station "${station.name}"?`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.del(`/api/stations/${station.id}`);
      setSuccess(`Station "${station.name}" deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Toggles a node in or out of service; the API blocks unsafe deactivation.
  async function toggleActive(station) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/stations/${station.id}/${station.isActive ? 'deactivate' : 'activate'}`);
      setSuccess(`Station ${station.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Loads booking slots for the selected station.
  async function openSlotManager(station) {
    setSelectedStationForSlots(station);
    setSlotError('');
    setSlotForm({ ...emptySlotForm, totalSlots: station.totalSlots });
    setEditingSlotId(null);
    try {
      const data = await api.get(`/api/stations/${station.id}/slots?availableOnly=false`);
      setSlots(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // Reloads slots for the currently open station.
  async function refreshSlots() {
    if (!selectedStationForSlots) return;
    try {
      const data = await api.get(`/api/stations/${selectedStationForSlots.id}/slots?availableOnly=false`);
      setSlots(data);
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Submits a new booking slot or updates an existing one.
  async function handleSaveSlot(event) {
    event.preventDefault();
    setSlotError('');
    try {
      if (editingSlotId) {
        await api.put(`/api/stations/slots/${editingSlotId}`, {
          startTime: new Date(slotForm.startTime).toISOString(),
          endTime: new Date(slotForm.endTime).toISOString(),
          totalSlots: Number(slotForm.totalSlots),
        });
      } else {
        await api.post(`/api/stations/${selectedStationForSlots.id}/slots`, {
          startTime: new Date(slotForm.startTime).toISOString(),
          endTime: new Date(slotForm.endTime).toISOString(),
          totalSlots: Number(slotForm.totalSlots),
        });
      }
      setSlotForm({ ...emptySlotForm, totalSlots: selectedStationForSlots.totalSlots });
      setEditingSlotId(null);
      refreshSlots();
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Deletes an unused booking slot.
  async function handleDeleteSlot(slotId) {
    if (!window.confirm('Delete this booking slot window?')) return;
    setSlotError('');
    try {
      await api.del(`/api/stations/slots/${slotId}`);
      refreshSlots();
    } catch (err) {
      setSlotError(err.message);
    }
  }

  // Helper to pre-populate slot edit fields in ISO format suitable for datetime-local input.
  function startEditSlot(slot) {
    setEditingSlotId(slot.id);
    const startIso = new Date(slot.startTime).toISOString().slice(0, 16);
    const endIso = new Date(slot.endTime).toISOString().slice(0, 16);
    setSlotForm({
      startTime: startIso,
      endTime: endIso,
      totalSlots: slot.totalSlots,
    });
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">Microgrid Nodes & Battery Storage</h1>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show">{error}</div>}
      {success && <div className="alert alert-success alert-dismissible fade show">{success}</div>}

      {isBackoffice && (
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 text-muted mb-3">Register a new solar grid hub</h2>
            <form className="row g-2" onSubmit={handleCreate}>
              {[
                ['name', 'Name', 'text'],
                ['location', 'Location', 'text'],
                ['latitude', 'Latitude', 'number'],
                ['longitude', 'Longitude', 'number'],
                ['capacityKwh', 'Capacity (kW/h)', 'number'],
                ['totalSlots', 'Battery slots', 'number'],
              ].map(([key, label, type]) => (
                <div className="col-6 col-lg-2" key={key}>
                  <input
                    className="form-control"
                    type={type}
                    step="any"
                    placeholder={label}
                    value={createForm[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                    required
                  />
                </div>
              ))}
              <div className="col-12">
                <button className="btn btn-warning btn-sm fw-semibold">Add node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>GPS</th>
                <th>Capacity</th>
                <th>Slots</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => (
                <tr key={station.id}>
                  <td className="fw-semibold">{station.name}</td>
                  <td>{station.location}</td>
                  <td className="small text-muted">
                    {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                  </td>
                  <td>{station.capacityKwh} kW/h</td>
                  <td>{station.totalSlots} bays</td>
                  <td>
                    <span className={`badge ${station.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {station.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => openSlotManager(station)}
                      title="Manage booking time windows and battery slots"
                    >
                      <i className="bi bi-clock-history me-1" />
                      Slots
                    </button>
                    {isBackoffice && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => setEditingStation(station)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm me-1 ${station.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          onClick={() => toggleActive(station)}
                        >
                          {station.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteStation(station)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No microgrid nodes registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Station Modal */}
      {editingStation && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Edit Microgrid Node</h5>
                <button type="button" className="btn-close" onClick={() => setEditingStation(null)} />
              </div>
              <form onSubmit={handleUpdateStation}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small text-muted">Node Name</label>
                    <input
                      className="form-control"
                      value={editingStation.name}
                      onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-muted">Location</label>
                    <input
                      className="form-control"
                      value={editingStation.location}
                      onChange={(e) => setEditingStation({ ...editingStation, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-muted">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editingStation.latitude}
                        onChange={(e) => setEditingStation({ ...editingStation, latitude: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editingStation.longitude}
                        onChange={(e) => setEditingStation({ ...editingStation, longitude: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small text-muted">Capacity (kW/h)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={editingStation.capacityKwh}
                        onChange={(e) => setEditingStation({ ...editingStation, capacityKwh: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted">Battery Storage Slots</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editingStation.totalSlots}
                        onChange={(e) => setEditingStation({ ...editingStation, totalSlots: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setEditingStation(null)}>
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

      {/* Slot Management Modal / Panel */}
      {selectedStationForSlots && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Battery Slot Schedules</h5>
                  <small className="text-muted">
                    {selectedStationForSlots.name} ({selectedStationForSlots.totalSlots} max physical bays)
                  </small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedStationForSlots(null)} />
              </div>
              <div className="modal-body">
                {slotError && <div className="alert alert-danger py-2 small">{slotError}</div>}

                {/* Add or Edit Slot Form */}
                <div className="card bg-light border-0 mb-4">
                  <div className="card-body py-3">
                    <h6 className="card-subtitle mb-2 text-muted fw-semibold">
                      {editingSlotId ? 'Edit Time Window' : 'Open New Booking Window'}
                    </h6>
                    <form className="row g-2 align-items-end" onSubmit={handleSaveSlot}>
                      <div className="col-12 col-md-4">
                        <label className="form-label small text-muted">Start Time</label>
                        <input
                          type="datetime-local"
                          className="form-control form-control-sm"
                          value={slotForm.startTime}
                          onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small text-muted">End Time</label>
                        <input
                          type="datetime-local"
                          className="form-control form-control-sm"
                          value={slotForm.endTime}
                          onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label small text-muted">Available Bays</label>
                        <input
                          type="number"
                          min="1"
                          max={selectedStationForSlots.totalSlots}
                          className="form-control form-control-sm"
                          value={slotForm.totalSlots}
                          onChange={(e) => setSlotForm({ ...slotForm, totalSlots: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-6 col-md-2 d-flex gap-1">
                        <button type="submit" className="btn btn-sm btn-warning fw-semibold flex-grow-1">
                          {editingSlotId ? 'Update' : 'Open'}
                        </button>
                        {editingSlotId && (
                          <button
                            type="button"
                            className="btn btn-sm btn-light"
                            onClick={() => {
                              setEditingSlotId(null);
                              setSlotForm({ ...emptySlotForm, totalSlots: selectedStationForSlots.totalSlots });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Existing Slots Table */}
                <h6 className="text-muted mb-2">Configured Slots</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Window Start</th>
                        <th>Window End</th>
                        <th>Bays Offered</th>
                        <th>Live Available</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => {
                        const isPast = new Date(slot.endTime) < new Date();
                        return (
                          <tr key={slot.id} className={isPast ? 'text-muted' : ''}>
                            <td>{new Date(slot.startTime).toLocaleString()}</td>
                            <td>{new Date(slot.endTime).toLocaleString()}</td>
                            <td>{slot.totalSlots} bays</td>
                            <td>
                              <span
                                className={`badge ${
                                  slot.availableSlots > 0 ? 'text-bg-success' : 'text-bg-danger'
                                }`}
                              >
                                {slot.availableSlots} free
                              </span>
                            </td>
                            <td>
                              {isPast ? (
                                <span className="badge text-bg-secondary">Expired</span>
                              ) : (
                                <span className="badge text-bg-info">Open</span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-link p-0 text-primary me-2"
                                onClick={() => startEditSlot(slot)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-link p-0 text-danger"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {slots.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-3">
                            No booking windows scheduled for this station.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedStationForSlots(null)}
                >
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
