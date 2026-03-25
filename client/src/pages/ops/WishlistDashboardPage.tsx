import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface WishlistEntry {
  memberId: string; memberName: string; memberEmail: string;
  packageId: string; packageTitle: string; packageLocation: string; savedAt: string;
}

export default function WishlistDashboardPage() {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<WishlistEntry[]>('/dashboard/wishlist')
      .then((r) => setEntries(r.data))
      .catch((err: any) => setError(err.response?.data?.message ?? 'Failed to load wishlist data.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? entries.filter((e) =>
        e.memberName.toLowerCase().includes(filter.toLowerCase()) ||
        e.memberEmail.toLowerCase().includes(filter.toLowerCase()) ||
        e.packageTitle.toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  // Group by package for summary
  const packageCounts = entries.reduce<Record<string, { title: string; count: number }>>((acc, e) => {
    if (!acc[e.packageId]) acc[e.packageId] = { title: e.packageTitle, count: 0 };
    acc[e.packageId].count++;
    return acc;
  }, {});
  const topPackages = Object.entries(packageCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h2>Wishlist Dashboard</h2>
        <p>See what members are saving — great for targeted voucher campaigns</p>
      </div>

      {topPackages.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          {topPackages.map(([id, { title, count }]) => (
            <div key={id} className="stat-card">
              <div className="stat-card-label">Wishlisted</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--brand-primary)', marginTop: '0.25rem' }}>{title}</div>
              <div className="stat-card-value">{count}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <input
          className="form-input"
          placeholder="Filter by member name, email or package…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-muted">No wishlist entries found.</p>
      )}

      {filtered.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Package</th><th>Location</th><th>Saved</th></tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={i}>
                  <td>
                    <div className="font-semibold">{e.memberName}</div>
                    <div className="text-xs text-muted">{e.memberEmail}</div>
                  </td>
                  <td className="font-semibold">{e.packageTitle}</td>
                  <td className="text-muted">📍 {e.packageLocation}</td>
                  <td className="text-sm text-muted">{new Date(e.savedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
