import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface MemberProfile {
  id: string; email: string; name: string; role: string; phone: string | null;
  status: string; membershipExpiry: string; expiringSoon: boolean;
  tier: { id: string; name: string; discountMultiplier: string };
}

const TIER_BADGE: Record<string, string> = {
  Silver: 'badge-gray', Gold: 'badge-yellow', Platinum: 'badge-blue',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);

  const load = () =>
    api.get<MemberProfile>('/members/me')
      .then((res) => { setProfile(res.data); setPhone(res.data.phone ?? ''); })
      .catch(() => setError('Failed to load profile.'));

  useEffect(() => { load(); }, []);

  const savePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/members/me', { phone });
      setPhoneMsg('Phone updated.');
      setEditingPhone(false);
      load();
    } catch { setPhoneMsg('Failed to update phone.'); }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!profile) return <div className="loading-screen">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h2>{profile.name}</h2>
          {profile.expiringSoon && <span className="badge badge-orange">⚠ Expiring Soon</span>}
          <span className={`badge ${TIER_BADGE[profile.tier?.name] ?? 'badge-gray'}`}>{profile.tier?.name ?? 'No Tier'}</span>
        </div>
        <p>Your membership details</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <table className="profile-table">
          <tbody>
            <tr><td>Email</td><td>{profile.email}</td></tr>
            <tr>
              <td>Phone</td>
              <td>
                {editingPhone ? (
                  <form onSubmit={savePhone} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" style={{ maxWidth: 200 }} />
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingPhone(false)}>Cancel</button>
                  </form>
                ) : (
                  <span>
                    {profile.phone ?? <span className="text-muted">Not set</span>}
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: '0.75rem' }} onClick={() => setEditingPhone(true)}>Edit</button>
                  </span>
                )}
                {phoneMsg && <span className="text-sm" style={{ marginLeft: '0.5rem', color: 'var(--success-text)' }}>{phoneMsg}</span>}
              </td>
            </tr>
            <tr>
              <td>Tier</td>
              <td><span className={`badge ${TIER_BADGE[profile.tier?.name] ?? 'badge-gray'}`}>{profile.tier?.name ?? '—'}</span></td>
            </tr>
            <tr>
              <td>Discount</td>
              <td>{profile.tier ? `${(parseFloat(profile.tier.discountMultiplier) * 100).toFixed(0)}%` : '—'}</td>
            </tr>
            <tr>
              <td>Membership Expiry</td>
              <td>{profile.membershipExpiry ? new Date(profile.membershipExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td>
            </tr>
            <tr>
              <td>Account Status</td>
              <td><span className={`badge ${profile.status === 'active' ? 'badge-green' : 'badge-red'}`}>{profile.status}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
