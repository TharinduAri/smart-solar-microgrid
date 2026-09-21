// Home screen showing live metrics, recent reservation activity, and station capacity.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  // Loads dashboard statistics, recent activity, and station status.
  useEffect(() => {
    Promise.all([
      api.get('/api/reservations/dashboard'),
      api.get('/api/reservations'),
      api.get('/api/stations'),
    ])
      .then(([dashSummary, reservations, stationList]) => {
        setSummary(dashSummary);
        setRecentReservations(reservations.slice(0, 5));
        setStations(stationList);
      })
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: 'Pending Reservations', value: summary?.pendingReservations, icon: 'hourglass-split', color: 'text-warning' },
    { label: 'Approved Future Bookings', value: summary?.approvedFutureReservations, icon: 'calendar-check', color: 'text-success' },
    { label: 'Completed Transfers', value: summary?.completedReservations, icon: 'check2-circle', color: 'text-info' },
    { label: 'Active Microgrid Hubs', value: summary?.activeStations, icon: 'lightning-charge', color: 'text-primary' },
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-0">Microgrid Operations Dashboard</h1>
          <div className="text-muted small">Live overview of solar power trading and battery storage slots</div>
        </div>
        <div className="d-flex gap-2">
          <Link to="/reservations" className="btn btn-warning btn-sm fw-semibold">
            <i className="bi bi-calendar-plus me-1" />
            Manage Bookings
          </Link>
          <Link to="/stations" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-diagram-3 me-1" />
            Grid Hubs
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show">{error}</div>}

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <div className="card ss-stat-card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <span className="text-muted small fw-semibold">{card.label}</span>
                  <i className={`bi bi-${card.icon} ${card.color} fs-5`} />
                </div>
                <div className="fs-2 fw-semibold mt-2">{card.value ?? '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Recent Reservations Table */}
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 fw-semibold text-dark">Recent Energy Trading Activity</h2>
              <Link to="/reservations" className="small text-decoration-none fw-semibold">
                View all →
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Prosumer</th>
                    <th>Node</th>
                    <th>Time</th>
                    <th>Energy</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="fw-semibold small">{r.prosumerName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {r.prosumerNic}
                        </div>
                      </td>
                      <td className="small">{r.stationName}</td>
                      <td className="small text-muted">{new Date(r.reservationTime).toLocaleDateString()}</td>
                      <td className="small fw-semibold">{r.energyKwh} kWh</td>
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
                    </tr>
                  ))}
                  {recentReservations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No recent reservation activity.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Microgrid Hub Status */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 fw-semibold text-dark">Solar Microgrid Hubs</h2>
              <Link to="/stations" className="small text-decoration-none fw-semibold">
                Manage Hubs →
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Hub Name</th>
                    <th>Throughput</th>
                    <th>Capacity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-semibold small">{s.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {s.location}
                        </div>
                      </td>
                      <td className="small">{s.capacityKwh} kW/h</td>
                      <td className="small">{s.totalSlots} bays</td>
                      <td>
                        <span className={`badge ${s.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {s.isActive ? 'Active' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No microgrid hubs registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
