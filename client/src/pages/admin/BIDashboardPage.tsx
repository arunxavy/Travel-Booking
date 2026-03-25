import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface BookingsByMonth { year: number; month: number; count: number; }
interface BookingsByYear { year: number; count: number; }
interface ExpiringMembership { id: string; name: string; email: string; membershipExpiry: string; tier: string | null; }
interface TopWishlistedPackage { packageId: string; title: string; location: string; saveCount: number; }
interface VoucherRedemptionRate { valueType: string; totalIssued: number; totalRedeemed: number; redemptionRate: number; }

interface BIMetrics {
  bookingsByMonth: BookingsByMonth[];
  bookingsByYear: BookingsByYear[];
  expiringMemberships: ExpiringMembership[];
  topWishlistedPackages: TopWishlistedPackage[];
  voucherRedemptionRates: VoucherRedemptionRate[];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const VALUE_TYPE_LABELS: Record<string, string> = {
  cashback: 'Cashback', seasonal: 'Seasonal', tier_locked: 'Tier Locked', free_night: 'Free Night',
};

export default function BIDashboardPage() {
  const [metrics, setMetrics] = useState<BIMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BIMetrics>('/dashboard/bi')
      .then((r) => setMetrics(r.data))
      .catch((err: any) => setError(err.response?.data?.message ?? 'Failed to load BI metrics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Loading BI metrics…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!metrics) return null;

  const totalBookings = metrics.bookingsByYear.reduce((s, r) => s + r.count, 0);
  const expiringCount = metrics.expiringMemberships.length;
  const topPackage = metrics.topWishlistedPackages[0];

  return (
    <div>
      <div className="page-header">
        <h2>BI Dashboard</h2>
        <p>Business intelligence overview for DNA Holidays</p>
      </div>

      {/* Summary stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Bookings</div>
          <div className="stat-card-value">{totalBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Expiring Soon</div>
          <div className="stat-card-value" style={{ color: expiringCount > 0 ? '#e8a020' : 'var(--brand-primary)' }}>{expiringCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Top Package</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
            {topPackage?.title ?? '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Wishlisted Packages</div>
          <div className="stat-card-value">{metrics.topWishlistedPackages.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>

        {/* Bookings by Month */}
        <div className="card">
          <div className="section-title">Confirmed Bookings by Month</div>
          {metrics.bookingsByMonth.length === 0 ? (
            <p className="text-muted text-sm">No confirmed bookings yet.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Year</th><th>Month</th><th>Count</th></tr></thead>
              <tbody>
                {metrics.bookingsByMonth.map((r) => (
                  <tr key={`${r.year}-${r.month}`}>
                    <td>{r.year}</td>
                    <td>{MONTH_NAMES[r.month - 1]}</td>
                    <td><span className="badge badge-blue">{r.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bookings by Year */}
        <div className="card">
          <div className="section-title">Confirmed Bookings by Year</div>
          {metrics.bookingsByYear.length === 0 ? (
            <p className="text-muted text-sm">No confirmed bookings yet.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Year</th><th>Count</th></tr></thead>
              <tbody>
                {metrics.bookingsByYear.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td><span className="badge badge-blue">{r.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Expiring Memberships */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="section-title">Members Expiring Within 60 Days</div>
          {metrics.expiringMemberships.length === 0 ? (
            <p className="text-muted text-sm">No memberships expiring soon.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Name</th><th>Email</th><th>Tier</th><th>Expiry</th></tr></thead>
              <tbody>
                {metrics.expiringMemberships.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold">{m.name}</td>
                    <td className="text-muted">{m.email}</td>
                    <td>{m.tier ?? '—'}</td>
                    <td><span className="badge badge-orange">{m.membershipExpiry}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Wishlisted */}
        <div className="card">
          <div className="section-title">Top 10 Most Wishlisted</div>
          {metrics.topWishlistedPackages.length === 0 ? (
            <p className="text-muted text-sm">No wishlist data yet.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>#</th><th>Package</th><th>Saves</th></tr></thead>
              <tbody>
                {metrics.topWishlistedPackages.map((p, i) => (
                  <tr key={p.packageId}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-muted">📍 {p.location}</div>
                    </td>
                    <td><span className="badge badge-green">{p.saveCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Voucher Redemption */}
        <div className="card">
          <div className="section-title">Voucher Redemption Rates</div>
          {metrics.voucherRedemptionRates.length === 0 ? (
            <p className="text-muted text-sm">No voucher data yet.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Type</th><th>Issued</th><th>Redeemed</th><th>Rate</th></tr></thead>
              <tbody>
                {metrics.voucherRedemptionRates.map((r) => (
                  <tr key={r.valueType}>
                    <td>{VALUE_TYPE_LABELS[r.valueType] ?? r.valueType}</td>
                    <td>{r.totalIssued}</td>
                    <td>{r.totalRedeemed}</td>
                    <td>
                      <span className={`badge ${r.redemptionRate >= 50 ? 'badge-green' : 'badge-yellow'}`}>
                        {r.redemptionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
