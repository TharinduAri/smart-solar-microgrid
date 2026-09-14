// Guards a route so only signed-in users - optionally only certain roles - reach it.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  // Not signed in at all - send the visitor to the login screen.
  if (!user) return <Navigate to="/login" replace />;

  // Signed in but the role is not allowed on this page.
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
