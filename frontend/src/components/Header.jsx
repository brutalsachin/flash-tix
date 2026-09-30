import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HOME_FOR, useAuth } from '../context/AuthContext';

export function Logo() {
  return (
    <span className="logo-word">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" />
      </svg>
      FlashTix
    </span>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const signOut = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" onClick={close} aria-label="FlashTix home">
          <Logo />
        </Link>

        <button className="menu-btn" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen((o) => !o)}>
          <span className="sr-only">Menu</span>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <nav id="primary-nav" className={`nav ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>Events</NavLink>
          {user?.role === 'USER' && <NavLink to="/tickets" onClick={close}>My tickets</NavLink>}
          {user && user.role !== 'USER' && (
            <NavLink to={HOME_FOR[user.role]} onClick={close}>
              {user.role === 'ADMIN' ? 'Admin panel' : 'Organizer panel'}
            </NavLink>
          )}
          {user ? (
            <div className="nav-user">
              <span className="avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
              <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              <button className="btn btn-ghost btn-small" onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-dark btn-small" onClick={close}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
