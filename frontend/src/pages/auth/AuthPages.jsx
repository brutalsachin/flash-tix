import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, IS_MOCK } from '../../api/client';
import { HOME_FOR, useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Header';

const DEMO = [
  { role: 'Admin', email: 'admin@flashtix.in', password: 'admin123', note: 'Approves events, adds organizers' },
  { role: 'Organizer', email: 'organizer@flashtix.in', password: 'org12345', note: 'Creates events, tracks sales' },
  { role: 'User', email: 'user@flashtix.in', password: 'user1234', note: 'Books tickets' },
];

function AuthShell({ title, lede, children, aside }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="logo on-dark"><Logo /></Link>
        <div>
          <p className="auth-side-title">One account for every seat you'll ever grab.</p>
          {aside}
        </div>
        <p className="auth-side-foot">Seats are held for you while you pay. Nobody can take them.</p>
      </aside>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <h1>{title}</h1>
          {lede && <p className="muted">{lede}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      const u = await login(email, password);
      const from = location.state?.from;
      // Only send users back to a page their role can open.
      const ok = from && (u.role === 'USER' ? !from.startsWith('/admin') && !from.startsWith('/organizer') : from.startsWith(HOME_FOR[u.role]));
      navigate(ok ? from : HOME_FOR[u.role], { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const fill = (d) => {
    setEmail(d.email);
    setPassword(d.password);
    setError('');
  };

  return (
    <AuthShell
      title="Sign in"
      lede="Admins, organizers and ticket buyers all sign in here."
      aside={
        IS_MOCK && (
          <div className="demo-accounts">
            <p>Demo accounts (tap to fill in)</p>
            {DEMO.map((d) => (
              <button key={d.role} type="button" onClick={() => fill(d)}>
                <strong>{d.role}</strong>
                <span>{d.note}</span>
              </button>
            ))}
          </div>
        )
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-alt">
        New to FlashTix? <Link to="/signup" state={location.state}>Create an account</Link>
      </p>
      <p className="fine left">Organizer accounts are created by the FlashTix team. Check your email for an invite link.</p>
      {IS_MOCK && (
        <div className="demo-inline">
          {DEMO.map((d) => (
            <button key={d.role} type="button" className="chip" onClick={() => fill(d)}>{d.role} demo</button>
          ))}
        </div>
      )}
    </AuthShell>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email, like name@example.com.';
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError('');
    try {
      await signup(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" lede="Book seats, get reminders when sales open, and keep all your tickets in one place.">
      <form onSubmit={submit} noValidate>
        <Field id="su-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field id="su-email" label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <Field id="su-password" label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-alt">
        Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function AcceptInvite() {
  const { token } = useParams();
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();
  const [invitee, setInvitee] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getInvite(token).then(setInvitee).catch((e) => setLoadError(e.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await acceptInvite(token, pw);
      navigate('/organizer', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <AuthShell title="Invite link not valid" lede={loadError}>
        <Link to="/login" className="btn btn-dark">Go to sign in</Link>
      </AuthShell>
    );
  }
  if (!invitee) return <div className="loader" aria-label="Loading" />;

  return (
    <AuthShell
      title="Set up your organizer account"
      lede={`Welcome, ${invitee.name}. You've been added as an organizer for ${invitee.org?.name}. Choose a password to finish.`}
    >
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="inv-email">Email</label>
          <input id="inv-email" value={invitee.email} disabled />
        </div>
        <Field id="inv-pw" label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="At least 8 characters." />
        <Field id="inv-pw2" label="Confirm password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Saving…' : 'Create password and continue'}</button>
      </form>
    </AuthShell>
  );
}

export function Field({ id, label, error, hint, as = 'input', children, ...rest }) {
  const Tag = as;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest}>
        {children}
      </Tag>
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    </div>
  );
}
