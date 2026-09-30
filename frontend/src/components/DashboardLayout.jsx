import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Header';

const ICONS = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  events: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a5 5 0 0 0-4-5',
  bookings: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z M9 8h6 M9 12h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  log: 'M4 5h16M4 10h16M4 15h10M4 20h7',
  plus: 'M12 5v14M5 12h14',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardLayout({ role, nav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`dash dash-${role.toLowerCase()}`}>
      <a className="skip-link" href="#dash-main">Skip to content</a>
      <aside className="dash-side">
        <div className="dash-brand">
          <Link to="/" className="logo on-dark" aria-label="FlashTix public site"><Logo /></Link>
          <span className="role-chip">{role === 'ADMIN' ? 'Admin' : 'Organizer'}</span>
        </div>
        <nav className="dash-nav" aria-label={`${role.toLowerCase()} navigation`}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.badge ? <span className="nav-count">{n.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="dash-user">
          <span className="avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
          <div className="dash-user-text">
            <strong>{user.name}</strong>
            <span>{user.org?.name || user.email}</span>
          </div>
          <button
            className="link-btn on-dark"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main id="dash-main" className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHead({ title, sub, actions, back }) {
  return (
    <div className="page-head">
      <div>
        {back && <Link to={back.to} className="back">← {back.label}</Link>}
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
