import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { StatusBadge } from '../../components/ui';
import { Field } from '../auth/AuthPages';

const inviteUrl = (t) => `${window.location.href.split('#')[0]}#/invite/${t}`;

function CopyLink({ token }) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(token);
  return (
    <span className="copy-link">
      <a href={url} target="_blank" rel="noreferrer">Open invite</a>
      <button
        className="link-btn"
        onClick={() =>
          navigator.clipboard
            ?.writeText(url)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </span>
  );
}

export default function AdminOrganizers() {
  const [list, setList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', orgName: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.listUsers('ORGANIZER').then(setList);
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter the organizer’s name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!form.orgName.trim()) errs.orgName = 'Enter the company or group name.';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) errs.phone = 'Enter a 10-digit mobile number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError('');
    try {
      const u = await api.inviteOrganizer(form);
      setCreated(u);
      setForm({ name: '', email: '', orgName: '', phone: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u) => {
    await api.setUserStatus(u.id, u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED');
    load();
  };

  return (
    <>
      <PageHead
        title="Organizers"
        sub="Only the people you add here can create events."
        actions={!showForm && <button className="btn" onClick={() => { setShowForm(true); setCreated(null); }}>Add organizer</button>}
      />

      {created && (
        <div className="notice good">
          <div>
            <strong>{created.name} was added.</strong> We've emailed {created.email} a link to set their password. You can also share it yourself:
          </div>
          <CopyLink token={created.inviteToken} />
        </div>
      )}

      {showForm && (
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <h2>Add an organizer</h2>
          <div className="form-grid">
            <Field id="o-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
            <Field id="o-email" label="Work email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Field id="o-org" label="Company or group" value={form.orgName} onChange={set('orgName')} error={errors.orgName} />
            <Field id="o-phone" label="Mobile number" type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} error={errors.phone} />
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
          <div className="row-actions">
            <button className="btn" disabled={busy}>{busy ? 'Adding…' : 'Add and send invite'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {!list ? (
        <div className="loader" aria-label="Loading" />
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead>
              <tr><th>Organizer</th><th>Company</th><th>Status</th><th>Events</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><span className="cell-sub">{u.email}</span></td>
                  <td>{u.org?.name}<span className="cell-sub">{u.org?.phone}</span></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="num">{u.events}</td>
                  <td className="cell-actions">
                    {u.status === 'INVITED' ? (
                      <CopyLink token={u.inviteToken} />
                    ) : (
                      <button className={`btn btn-small ${u.status === 'SUSPENDED' ? '' : 'btn-ghost'}`} onClick={() => toggle(u)}>
                        {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
