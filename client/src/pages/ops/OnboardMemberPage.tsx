import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface Tier { id: string; name: string; }
interface Credentials { email: string; temporaryPassword: string; }

export default function OnboardMemberPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tierId, setTierId] = useState('');
  const [membershipExpiry, setMembershipExpiry] = useState('');
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Tier[]>('/members/tiers').then((r) => {
      setTiers(r.data);
      if (r.data.length > 0) setTierId(r.data[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setCredentials(null); setLoading(true);
    try {
      const res = await api.post<{ member: { email: string }; temporaryPassword: string }>('/members', {
        email, name, phone: phone || undefined, tierId, membershipExpiry,
      });
      setCredentials({ email: res.data.member.email, temporaryPassword: res.data.temporaryPassword });
      setEmail(''); setName(''); setPhone(''); setMembershipExpiry('');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Onboard New Member</h2>
        <p>Create a new member account and generate their login credentials</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="member@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="form-group">
            <label className="form-label">Tier</label>
            <select className="form-select" value={tierId} onChange={(e) => setTierId(e.target.value)} required>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Membership Expiry</label>
            <input type="date" className="form-input" value={membershipExpiry} onChange={(e) => setMembershipExpiry(e.target.value)} required />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Creating…' : 'Create Member'}
          </button>
        </form>
      </div>

      {credentials && (
        <div className="alert alert-success card mt-4" style={{ maxWidth: 480, marginTop: '1.5rem' }}>
          <p className="font-semibold" style={{ marginBottom: '0.5rem', color: 'var(--success-text)' }}>✓ Member created successfully!</p>
          <p className="text-sm">Email: <strong>{credentials.email}</strong></p>
          <p className="text-sm mt-1">Temporary Password: <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{credentials.temporaryPassword}</code></p>
          <p className="text-xs text-muted mt-2">Share these credentials securely with the member.</p>
        </div>
      )}
    </div>
  );
}
