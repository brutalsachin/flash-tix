import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { StatusBadge } from '../../components/ui';

export default function AdminUsers() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');

  const load = () => api.listUsers('USER').then(setList);
  useEffect(() => {
    load();
  }, []);

  const toggle = async (u) => {
    await api.setUserStatus(u.id, u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED');
    load();
  };

  const term = q.trim().toLowerCase();
  const shown = (list || []).filter((u) => !term || `${u.name} ${u.email}`.toLowerCase().includes(term));

  return (
    <>
      <PageHead title="Users" sub="People who buy tickets. Suspended users can't sign in or book." />
      <div className="toolbar">
        <label className="search-box">
          <span className="sr-only">Search users</span>
          <input id="user-search" type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {!list ? (
        <div className="loader" aria-label="Loading" />
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead><tr><th>Name</th><th>Status</th><th>Bookings</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><span className="cell-sub">{u.email}</span></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="num">{u.bookings}</td>
                  <td className="cell-actions">
                    <button className={`btn btn-small ${u.status === 'SUSPENDED' ? '' : 'btn-ghost'}`} onClick={() => toggle(u)}>
                      {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                    </button>
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
