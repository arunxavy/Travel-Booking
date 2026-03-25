import React, { useState } from 'react';
import api from '../../lib/api';

interface Tier { id: string; name: string; }
interface Member {
  id: string; email: string; name: string; role: string; phone: string | null;
  status: string; membershipExpiry: string | null; tier: Tier | null;
}
interface SpecialDay { id: string; label: string; eventDate: string; }

export default function MemberManagementPage() {
  const [searchEmail, setSearchEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editTierId, setEditTierId] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPhone, setEditPhone] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Special days
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [sdMemberId, setSdMemberId] = useState<string | null>(null);
  const [sdEditId, setSdEditId] = useState<string | null>(null);
  const [sdEditLabel, setSdEditLabel] = useState('');
  const [sdEditDate, setSdEditDate] = useState('');
  const [sdMsg, setSdMsg] = useState<string | null>(null);

  const doSearch = async (email: string) => {
    setSearchError(null);
    try {
      const params: Record<string, string> = {};
      if (email) params.email = email;
      setMembers((await api.get<Member[]>('/members', { params })).data);
    } catch (err: any) {
      setSearchError(err.response?.data?.message ?? 'Search failed.');
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); doSearch(searchEmail); };

  const openEdit = async (member: Member) => {
    setEditing(member);
    setEditTierId(member.tier?.id ?? '');
    setEditExpiry(member.membershipExpiry ?? '');
    setEditStatus(member.status as 'active' | 'inactive');
    setEditPhone(member.phone ?? '');
    setSaveMsg(null); setSaveError(null);
    if (tiers.length === 0) setTiers((await api.get<Tier[]>('/members/tiers')).data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaveMsg(null); setSaveError(null);
    try {
      const updated = await api.patch<Member>(`/members/${editing.id}`, {
        tierId: editTierId || undefined, membershipExpiry: editExpiry || undefined,
        status: editStatus, phone: editPhone || undefined,
      });
      setSaveMsg('Member updated successfully.');
      setEditing(updated.data);
      setMembers((prev) => prev.map((m) => (m.id === updated.data.id ? updated.data : m)));
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? 'Update failed.');
    }
  };

  const loadSpecialDays = async (memberId: string) => {
    setSdMemberId(memberId);
    setSdMsg(null); setSdEditId(null);
    const res = await api.get<SpecialDay[]>(`/members/${memberId}/special-days`);
    setSpecialDays(res.data);
  };

  const startSdEdit = (sd: SpecialDay) => {
    setSdEditId(sd.id); setSdEditLabel(sd.label); setSdEditDate(sd.eventDate.slice(0, 10));
  };

  const saveSdEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdMemberId || !sdEditId) return;
    await api.patch(`/members/${sdMemberId}/special-days/${sdEditId}`, { label: sdEditLabel, eventDate: sdEditDate });
    setSdEditId(null); setSdMsg('Special day updated.');
    loadSpecialDays(sdMemberId);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Member Management</h2>
        <p>Search and update member accounts</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 260px' }}>
            <label className="form-label">Search by email</label>
            <input type="text" className="form-input" placeholder="member@example.com" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0.375rem' }}>Search</button>
          <button type="button" className="btn btn-outline" style={{ marginBottom: '0.375rem' }} onClick={() => { setSearchEmail(''); doSearch(''); }}>Show All</button>
        </form>
        {searchError && <div className="alert alert-error mt-2">{searchError}</div>}
      </div>

      {members.length === 0 ? (
        <p className="text-muted">No members found. Use the search above.</p>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Tier</th><th>Expiry</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.name}</td>
                  <td className="text-muted">{m.email}</td>
                  <td className="text-muted">{m.phone ?? '—'}</td>
                  <td>{m.tier?.name ?? '—'}</td>
                  <td className="text-sm text-muted">{m.membershipExpiry ?? '—'}</td>
                  <td><span className={`badge ${m.status === 'active' ? 'badge-green' : 'badge-red'}`}>{m.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                      <button className="btn btn-outline btn-sm" onClick={() => loadSpecialDays(m.id)}>Special Days</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="card" style={{ maxWidth: 480, marginBottom: '1.5rem' }}>
          <h3 className="card-title">Edit: {editing.name}</h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-select" value={editTierId} onChange={(e) => setEditTierId(e.target.value)}>
                <option value="">— No tier —</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Membership Expiry</label>
              <input type="date" className="form-input" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {saveMsg && <div className="alert alert-success">{saveMsg}</div>}
            {saveError && <div className="alert alert-error">{saveError}</div>}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {sdMemberId && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Special Days — {members.find((m) => m.id === sdMemberId)?.name}</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setSdMemberId(null)}>✕ Close</button>
          </div>
          {sdMsg && <div className="alert alert-success mb-4" style={{ marginBottom: '1rem' }}>{sdMsg}</div>}
          {specialDays.length === 0 ? (
            <p className="text-muted text-sm">No special days recorded.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Label</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {specialDays.map((sd) => (
                  <tr key={sd.id}>
                    <td>
                      {sdEditId === sd.id
                        ? <input className="form-input" value={sdEditLabel} onChange={(e) => setSdEditLabel(e.target.value)} style={{ maxWidth: 180 }} />
                        : sd.label}
                    </td>
                    <td>
                      {sdEditId === sd.id
                        ? <input type="date" className="form-input" value={sdEditDate} onChange={(e) => setSdEditDate(e.target.value)} style={{ maxWidth: 160 }} />
                        : new Date(sd.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                    </td>
                    <td>
                      {sdEditId === sd.id ? (
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={saveSdEdit}>Save</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setSdEditId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => startSdEdit(sd)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
