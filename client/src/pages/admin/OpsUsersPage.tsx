import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface OpsUser { id: string; email: string; name: string; status: string; createdAt: string; }
interface Credentials { email: string; temporaryPassword: string; }

export default function OpsUsersPage() {
  const [users, setUsers] = useState<OpsUser[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => api.get<OpsUser[]>('/members/ops-users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setCredentials(null); setLoading(true);
    try {
      const res = await api.post<{ opsUser: OpsUser; temporaryPassword: string }>('/members/ops-users', { email, name });
      setCredentials({ email: res.data.opsUser.email, temporaryPassword: res.data.temporaryPassword });
      setEmail(''); setName('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create ops user.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (user: OpsUser) => {
    setTogglingId(user.id);
    try {
      await api.patch(`/members/ops-users/${user.id}`, { status: user.status === 'active' ? 'inactive' : 'active' });
      load();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Ops User Management</h2>
        <p>Create and manage operations staff accounts</p>
      </div>

      <div className="card" style={{ maxWidth: 460, marginBottom: '2rem' }}>
        <h3 className="card-title">Add Ops User</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ops@example.com" />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Creating…' : 'Create Ops User'}
          </button>
        </form>
      </div>

      {credentials && (
        <div className="alert alert-success card" style={{ maxWidth: 460, marginBottom: '1.5rem' }}>
          <p className="font-semibold" style={{ color: 'var(--success-text)', marginBottom: '0.5rem' }}>✓ Ops user created!</p>
          <p className="text-sm">Email: <strong>{credentials.email}</strong></p>
          <p className="text-sm mt-1">Temporary Password: <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{credentials.temporaryPassword}</code></p>
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-muted">No ops users yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                  <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-outline'}`}
                      onClick={() => toggleStatus(u)}
                      disabled={togglingId === u.id}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
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
