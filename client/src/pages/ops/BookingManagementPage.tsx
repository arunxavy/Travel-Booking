import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface Booking {
  id: string; status: string; createdAt: string;
  memberName: string; memberEmail: string; voucherId: string | null;
  package: { id: string; title: string; location: string; price: string; };
}
interface CustomBooking {
  id: string; destination: string; hotelName: string | null; googleLink: string | null;
  checkIn: string; checkOut: string; adults: number; kids: number; kidAges: string | null;
  status: string; notes: string | null; createdAt: string;
  memberName: string; memberEmail: string; memberId: string;
}
interface Comment { id: string; message: string; authorRole: string; authorName: string; createdAt: string; }

const STATUS_LABELS: Record<string, string> = {
  new_request: 'New Request', in_review: 'In Review', confirmed: 'Confirmed', cancelled: 'Cancelled',
};
const STATUS_BADGE: Record<string, string> = {
  confirmed: 'badge-green', cancelled: 'badge-red', in_review: 'badge-blue', new_request: 'badge-yellow',
};
const TRANSITIONS: Record<string, string[]> = {
  new_request: ['in_review'], in_review: ['confirmed', 'cancelled'], confirmed: [], cancelled: [],
};

function CommentThread({ bookingId, type }: { bookingId: string; type: 'package' | 'custom' }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const endpoint = type === 'package' ? `/bookings/${bookingId}/comments` : `/bookings/custom/${bookingId}/comments`;

  const load = () => api.get<Comment[]>(endpoint).then((r) => setComments(r.data));
  useEffect(() => { load(); }, [bookingId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try { await api.post(endpoint, { message: msg }); setMsg(''); load(); }
    finally { setSending(false); }
  };

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        💬 Discussion ({comments.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: 240, overflowY: 'auto' }}>
        {comments.length === 0 && <p className="text-muted text-sm">No messages yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{
            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
            background: c.authorRole === 'member' ? '#eff6ff' : '#f0fdf4',
            alignSelf: c.authorRole === 'member' ? 'flex-start' : 'flex-end',
            maxWidth: '85%',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              {c.authorName} · {c.authorRole} · {new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
            <div style={{ fontSize: '0.9rem' }}>{c.message}</div>
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem' }}>
        <input className="form-input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Reply to member…" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !msg.trim()}>Send</button>
      </form>
    </div>
  );
}

export default function BookingManagementPage() {
  const [tab, setTab] = useState<'package' | 'custom'>('package');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customBookings, setCustomBookings] = useState<CustomBooking[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  useEffect(() => {
    api.get<Booking[]>('/bookings').then((r) => setBookings(r.data)).catch((e: any) => setLoadError(e.response?.data?.message ?? 'Failed to load bookings.'));
    api.get<CustomBooking[]>('/bookings/custom').then((r) => setCustomBookings(r.data));
  }, []);

  const changeStatus = async (id: string, status: string, type: 'package' | 'custom') => {
    setUpdating(id);
    setUpdateErrors((p) => ({ ...p, [id]: '' }));
    try {
      const url = type === 'package' ? `/bookings/${id}/status` : `/bookings/custom/${id}/status`;
      const res = await api.patch(url, { status });
      if (type === 'package') setBookings((p) => p.map((b) => b.id === id ? { ...b, ...res.data } : b));
      else setCustomBookings((p) => p.map((b) => b.id === id ? { ...b, ...res.data } : b));
    } catch (err: any) {
      setUpdateErrors((p) => ({ ...p, [id]: err.response?.data?.message ?? 'Update failed.' }));
    } finally { setUpdating(null); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Booking Management</h2>
        <p>Review and update booking statuses</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn${tab === 'package' ? ' active' : ''}`} onClick={() => setTab('package')}>
          Package Bookings ({bookings.length})
        </button>
        <button className={`tab-btn${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>
          Custom Requests ({customBookings.length})
        </button>
      </div>

      {loadError && <div className="alert alert-error mb-4">{loadError}</div>}

      {/* ── Package Bookings ── */}
      {tab === 'package' && (
        bookings.length === 0 ? <p className="text-muted">No package bookings found.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map((b) => {
              const allowed = TRANSITIONS[b.status] ?? [];
              return (
                <div key={b.id} className="card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <span className="font-semibold">{b.package.title}</span>
                      <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>📍 {b.package.location}</span>
                    </div>
                    <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
                  </div>
                  <div className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                    {b.memberName} · {b.memberEmail} · {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    {b.voucherId && <span className="badge badge-green" style={{ marginLeft: '0.5rem' }}>Voucher</span>}
                  </div>
                  {allowed.length > 0 && (
                    <div className="flex gap-2 flex-wrap" style={{ marginBottom: '0.5rem' }}>
                      {allowed.map((s) => (
                        <button key={s} className="btn btn-outline btn-sm" disabled={updating === b.id} onClick={() => changeStatus(b.id, s, 'package')}>
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                  {updateErrors[b.id] && <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>{updateErrors[b.id]}</div>}
                  <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setExpandedComment(expandedComment === b.id ? null : b.id)}>
                    {expandedComment === b.id ? '▲ Hide' : '💬 Discussion'}
                  </button>
                  {expandedComment === b.id && <CommentThread bookingId={b.id} type="package" />}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Custom Bookings ── */}
      {tab === 'custom' && (
        customBookings.length === 0 ? <p className="text-muted">No custom requests found.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {customBookings.map((b) => {
              const allowed = TRANSITIONS[b.status] ?? [];
              const ages = b.kidAges ? JSON.parse(b.kidAges) as number[] : [];
              return (
                <div key={b.id} className="card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <span className="font-semibold">{b.destination}</span>
                      {b.hotelName && <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>— {b.hotelName}</span>}
                    </div>
                    <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
                  </div>
                  <div className="text-sm text-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span>{b.memberName} · {b.memberEmail}</span>
                    <span>📅 {b.checkIn} → {b.checkOut}</span>
                    <span>👤 {b.adults} adult{b.adults !== 1 ? 's' : ''}{b.kids > 0 ? `, ${b.kids} child${b.kids !== 1 ? 'ren' : ''}${ages.length ? ` (${ages.join(', ')})` : ''}` : ''}</span>
                    {b.googleLink && <a href={b.googleLink} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-accent)' }}>📍 Maps</a>}
                  </div>
                  {b.notes && <div className="text-sm" style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>📝 {b.notes}</div>}
                  {allowed.length > 0 && (
                    <div className="flex gap-2 flex-wrap" style={{ marginBottom: '0.5rem' }}>
                      {allowed.map((s) => (
                        <button key={s} className="btn btn-outline btn-sm" disabled={updating === b.id} onClick={() => changeStatus(b.id, s, 'custom')}>
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                  {updateErrors[b.id] && <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>{updateErrors[b.id]}</div>}
                  <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setExpandedComment(expandedComment === b.id ? null : b.id)}>
                    {expandedComment === b.id ? '▲ Hide' : '💬 Discussion'}
                  </button>
                  {expandedComment === b.id && <CommentThread bookingId={b.id} type="custom" />}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
