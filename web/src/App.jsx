// Route table for the web application, including the role based guards.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StationsPage from './pages/StationsPage.jsx';
import ReservationsPage from './pages/ReservationsPage.jsx';
import ProsumersPage from './pages/ProsumersPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />

        {/* User administration is restricted to Backoffice officers. */}
        <Route
          path="/prosumers"
          element={
            <ProtectedRoute roles={['Backoffice']}>
              <ProsumersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['Backoffice']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
