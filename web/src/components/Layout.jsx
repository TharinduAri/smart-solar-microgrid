// Shared shell for every signed-in page: top navigation bar plus the page body.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout, isBackoffice } = useAuth();
  const navigate = useNavigate();

  // Ends the session and returns to the login screen.
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Grid Operators do not see the user administration screens.
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: 'speedometer2' },
    { to: '/stations', label: 'Microgrid Nodes', icon: 'lightning-charge' },
    { to: '/reservations', label: 'Reservations', icon: 'calendar-check' },
    ...(isBackoffice
      ? [
          { to: '/prosumers', label: 'Prosumers', icon: 'people' },
          { to: '/users', label: 'Web Users', icon: 'person-badge' },
        ]
      : []),
  ];

  return (
    <div className="min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark ss-navbar shadow-sm">
        <div className="container-fluid px-4">
          <span className="navbar-brand fw-semibold">
            <i className="bi bi-sun-fill me-2" />
            Smart Solar Microgrid
          </span>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#ssNav"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="ssNav">
            <ul className="navbar-nav me-auto">
              {links.map((link) => (
                <li className="nav-item" key={link.to}>
                  <NavLink className="nav-link" to={link.to}>
                    <i className={`bi bi-${link.icon} me-1`} />
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-3">
              <span className="text-white-50 small">
                {user?.fullName} &middot; {user?.role}
              </span>
              <button className="btn btn-sm btn-light" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container-fluid px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
