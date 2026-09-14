// Home screen showing the live reservation counts read from the Web API.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  // Loads the dashboard counts once when the page opens.
  useEffect(() => {
    api
      .get('/api/reservations/dashboard')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: 'Pending reservations', value: summary?.pendingReservations, icon: 'hourglass-split' },
    { label: 'Approved future reservations', value: summary?.approvedFutureReservations, icon: 'calendar-check' },
    { label: 'Completed transfers', value: summary?.completedReservations, icon: 'check2-circle' },
    { label: 'Active microgrid nodes', value: summary?.activeStations, icon: 'lightning-charge' },
  ];

  return (
    <>
      <h1 className="h4 mb-4">Dashboard</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        {cards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <div className="card ss-stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <span className="text-muted small">{card.label}</span>
                  <i className={`bi bi-${card.icon} text-warning fs-5`} />
                </div>
                <div className="fs-2 fw-semibold mt-2">{card.value ?? '-'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TODO: add a recent-activity table or a chart of reservations per node. */}
    </>
  );
}
