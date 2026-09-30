import { Link, Navigate, useLocation } from 'react-router-dom';
import { HOME_FOR, useAuth } from '../context/AuthContext';

// Route guard. The backend must check roles too; this only decides what to show.
export default function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="loader" aria-label="Loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) {
    return (
      <div className="container section narrow">
        <h1>You don't have access to this page</h1>
        <p className="muted">
          You're signed in as {user.email} ({user.role.toLowerCase()}). This area is for {roles.map((r) => r.toLowerCase()).join(' or ')} accounts.
        </p>
        <Link to={HOME_FOR[user.role]} className="btn btn-dark">Go to your home page</Link>
      </div>
    );
  }
  return children;
}
