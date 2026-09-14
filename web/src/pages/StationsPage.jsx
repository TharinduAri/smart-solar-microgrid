// Microgrid node management - lists nodes and creates new ones through the API.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { name: '', location: '', latitude: '', longitude: '', capacityKwh: '', totalSlots: '' };

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
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
    try {
      await api.post('/api/stations', {
        name: form.name,
        location: form.location,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacityKwh: Number(form.capacityKwh),
        totalSlots: Number(form.totalSlots),
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Toggles a node in or out of service; the API blocks unsafe deactivation.
  async function toggleActive(station) {
    setError('');
    try {
      await api.patch(`/api/stations/${station.id}/${station.isActive ? 'deactivate' : 'activate'}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="h4 mb-4">Microgrid Nodes</h1>

      {error && <div className="alert alert-danger">{error}</div>}

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
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
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
                <th />
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => (
                <tr key={station.id}>
                  <td className="fw-semibold">{station.name}</td>
                  <td>{station.location}</td>
                  <td className="small text-muted">
                    {station.latitude}, {station.longitude}
                  </td>
                  <td>{station.capacityKwh} kW/h</td>
                  <td>{station.totalSlots}</td>
                  <td>
                    <span className={`badge ${station.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {station.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-end">
                    {isBackoffice && (
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(station)}>
                        {station.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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

      {/* TODO: add an edit modal and a slot management panel per node. */}
    </>
  );
}
