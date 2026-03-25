import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface LookaheadEntry {
  memberName: string;
  label: string;
  eventDate: string;
  daysRemaining: number;
}

function urgencyBadge(days: number) {
  if (days <= 7) return 'badge-red';
  if (days <= 14) return 'badge-orange';
  return 'badge-blue';
}

export default function LookaheadPage() {
  const [entries, setEntries] = useState<LookaheadEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LookaheadEntry[]>('/dashboard/lookahead')
      .then((r) => setEntries(r.data))
      .catch((err: any) => setError(err.response?.data?.message ?? 'Failed to load lookahead data.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>30-Day Special Day Lookahead</h2>
        <p>Members with upcoming special days — great time to send a voucher</p>
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <p className="text-muted">No special days in the next 30 days.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Special Day</th>
                <th>Date</th>
                <th>Days Remaining</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={i}>
                  <td className="font-semibold">{entry.memberName}</td>
                  <td>{entry.label}</td>
                  <td className="text-muted">{entry.eventDate}</td>
                  <td>
                    <span className={`badge ${urgencyBadge(entry.daysRemaining)}`}>
                      {entry.daysRemaining} day{entry.daysRemaining !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
