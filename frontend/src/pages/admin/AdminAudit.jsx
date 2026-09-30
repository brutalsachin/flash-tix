import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { formatDateTime } from '../../utils';

export default function AdminAudit() {
  const [list, setList] = useState(null);
  useEffect(() => {
    api.auditLog().then(setList);
  }, []);

  return (
    <>
      <PageHead title="Activity log" sub="Every approval, cancellation, refund and account change, newest first." />
      {!list ? (
        <div className="loader" aria-label="Loading" />
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{formatDateTime(a.at)}</td>
                  <td>{a.actor}</td>
                  <td><strong>{a.action}</strong></td>
                  <td>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
