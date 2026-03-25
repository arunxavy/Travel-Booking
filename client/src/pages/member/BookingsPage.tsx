import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Package { id: string; title: string; }
interface Voucher { id: string; valueType: string; discountValue: string; }
interface Booking {
  id: string; status: string; createdAt: string;
  package: { title: string } | null;
  voucher: { valueType: string; discountValue: string } | null;
}
interface CustomBooking {
  id: string; destination: string; hotelName: string | null; googleLink: string | null;
  checkIn: string; checkOut: string; adults: number; kids: number; kidAges: string | null;
  status: string; notes: string | null; createdAt: string;
  voucher?: { valueType: string; discountValue: string } | null;
}
interface Comment { id: string; message: string; authorRole: string; authorName: string; createdAt: string; }
interface KidEntry { age: string; }

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'badge-green', cancelled: 'badge-red', in_review: 'badge-blue', new_request: 'badge-yellow',
};

// ── Comment Thread ────────────────────────────────────────────────────────────

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
        {comments.length === 0 && <p className="text-muted text-sm">No messages yet. Start the conversation.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: c.authorRole === 'member' ? '#eff6ff' : '#f0fdf4',
            alignSelf: c.authorRole === 'member' ? 'flex-end' : 'flex-start',
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
        <input
          className="form-input"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a message…"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !msg.trim()}>Send</button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [tab, setTab] = useState<'package' | 'custom'>('package');
  const [packages, setPackages] = useState<Package[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customBookings, setCustomBookings] = useState<CustomBooking[]>([]);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);

  // Package booking form
  const [selPkg, setSelPkg] = useState('');
  const [selVoucher, setSelVoucher] = useState('');
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [pkgSuccess, setPkgSuccess] = useState(false);

  // Custom booking form
  const [destination, setDestination] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [googleLink, setGoogleLink] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState('1');
  const [kids, setKids] = useState<KidEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [custVoucher, setCustVoucher] = useState('');
  const [custError, setCustError] = useState<string | null>(null);
  const [custSuccess, setCustSuccess] = useState(false);

  const loadAll = () => {
    api.get<Booking[]>('/bookings/me').then((r) => setBookings(r.data));
    api.get<CustomBooking[]>('/bookings/custom/me').then((r) => setCustomBookings(r.data));
  };

  useEffect(() => {
    api.get<Package[]>('/packages').then((r) => setPackages(r.data));
    api.get<{ available: Voucher[] }>('/vouchers/me').then((r) => setAvailableVouchers(r.data.available ?? []));
    loadAll();
  }, []);

  const submitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPkgError(null); setPkgSuccess(false);
    try {
      const body: Record<string, string> = { packageId: selPkg };
      if (selVoucher) body.voucherId = selVoucher;
      await api.post('/bookings', body);
      setSelPkg(''); setSelVoucher(''); setPkgSuccess(true); loadAll();
    } catch (err: any) { setPkgError(err.response?.data?.message ?? 'Failed to submit booking.'); }
  };

  const addKid = () => setKids((k) => [...k, { age: '' }]);
  const removeKid = (i: number) => setKids((k) => k.filter((_, idx) => idx !== i));
  const setKidAge = (i: number, age: string) => setKids((k) => k.map((e, idx) => idx === i ? { age } : e));

  const submitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError(null); setCustSuccess(false);
    try {
      const kidAges = kids.map((k) => parseInt(k.age)).filter((n) => !isNaN(n));
      await api.post('/bookings/custom', {
        destination, hotelName: hotelName || undefined, googleLink: googleLink || undefined,
        checkIn, checkOut, adults: parseInt(adults), kids: kids.length,
        kidAges: kidAges.length ? kidAges : undefined,
        voucherId: custVoucher || undefined, notes: notes || undefined,
      });
      setDestination(''); setHotelName(''); setGoogleLink(''); setCheckIn(''); setCheckOut('');
      setAdults('1'); setKids([]); setNotes(''); setCustVoucher('');
      setCustSuccess(true); loadAll();
    } catch (err: any) { setCustError(err.response?.data?.message ?? 'Failed to submit booking.'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Bookings</h2>
        <p>Book a package or request a custom holiday</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn${tab === 'package' ? ' active' : ''}`} onClick={() => setTab('package')}>Package Booking</button>
        <button className={`tab-btn${tab === 'custom' ? ' active' : ''}`} onClick={() => setTab('custom')}>Custom Request</button>
      </div>

      {/* ── Package Booking ── */}
      {tab === 'package' && (
        <>
          <div className="card" style={{ maxWidth: 520, marginBottom: '2rem' }}>
            <h3 className="card-title">New Package Booking</h3>
            <form onSubmit={submitPackage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Package</label>
                <select className="form-select" value={selPkg} onChange={(e) => setSelPkg(e.target.value)} required>
                  <option value="">Select a package…</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Voucher (optional)</label>
                <select className="form-select" value={selVoucher} onChange={(e) => setSelVoucher(e.target.value)}>
                  <option value="">No voucher</option>
                  {availableVouchers.map((v) => <option key={v.id} value={v.id}>{v.valueType} — {v.discountValue}</option>)}
                </select>
              </div>
              {pkgError && <div className="alert alert-error">{pkgError}</div>}
              {pkgSuccess && <div className="alert alert-success">Booking submitted!</div>}
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Booking</button>
            </form>
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Package Booking History</h3>
          {bookings.length === 0 ? <p className="text-muted">No package bookings yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bookings.map((b) => (
                <div key={b.id} className="card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <span className="font-semibold">{b.package?.title ?? '—'}</span>
                    <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{b.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {b.voucher ? `Voucher: ${b.voucher.valueType} (${b.voucher.discountValue})` : 'No voucher'} · {new Date(b.createdAt).toLocaleDateString('en-IN')}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }}
                    onClick={() => setExpandedComment(expandedComment === b.id ? null : b.id)}
                  >
                    {expandedComment === b.id ? '▲ Hide' : '💬 Discussion'}
                  </button>
                  {expandedComment === b.id && <CommentThread bookingId={b.id} type="package" />}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Custom Booking ── */}
      {tab === 'custom' && (
        <>
          <div className="card" style={{ maxWidth: 600, marginBottom: '2rem' }}>
            <h3 className="card-title">New Custom Holiday Request</h3>
            <form onSubmit={submitCustom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Destination *</label>
                  <input className="form-input" value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="e.g. Maldives, Bali" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hotel Name</label>
                  <input className="form-input" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="e.g. Taj Exotica" />
                </div>
                <div className="form-group">
                  <label className="form-label">Google Maps Link</label>
                  <input type="url" className="form-input" value={googleLink} onChange={(e) => setGoogleLink(e.target.value)} placeholder="https://maps.google.com/..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-in *</label>
                  <input type="date" className="form-input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-out *</label>
                  <input type="date" className="form-input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Adults *</label>
                  <input type="number" min="1" className="form-input" value={adults} onChange={(e) => setAdults(e.target.value)} required />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
                  <span className="form-label" style={{ margin: 0 }}>Children ({kids.length})</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addKid}>+ Add Child</button>
                </div>
                {kids.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {kids.map((k, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <input
                          type="number" min="0" max="17" className="form-input"
                          value={k.age} onChange={(e) => setKidAge(i, e.target.value)}
                          placeholder={`Child ${i + 1} age`}
                          style={{ width: 110 }}
                          required
                        />
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeKid(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Voucher (optional)</label>
                <select className="form-select" value={custVoucher} onChange={(e) => setCustVoucher(e.target.value)}>
                  <option value="">No voucher</option>
                  {availableVouchers.map((v) => <option key={v.id} value={v.id}>{v.valueType} — {v.discountValue}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests, preferences…" style={{ resize: 'vertical' }} />
              </div>

              {custError && <div className="alert alert-error">{custError}</div>}
              {custSuccess && <div className="alert alert-success">Custom booking request submitted! Our team will review it shortly.</div>}
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Request</button>
            </form>
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Custom Booking History</h3>
          {customBookings.length === 0 ? <p className="text-muted">No custom requests yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {customBookings.map((b) => {
                const ages = b.kidAges ? JSON.parse(b.kidAges) as number[] : [];
                return (
                  <div key={b.id} className="card">
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <span className="font-semibold">{b.destination}{b.hotelName ? ` — ${b.hotelName}` : ''}</span>
                      <span className={`badge ${STATUS_BADGE[b.status] ?? 'badge-gray'}`}>{b.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-sm text-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <span>📅 {b.checkIn} → {b.checkOut}</span>
                      <span>👤 {b.adults} adult{b.adults !== 1 ? 's' : ''}{b.kids > 0 ? `, ${b.kids} child${b.kids !== 1 ? 'ren' : ''}${ages.length ? ` (ages: ${ages.join(', ')})` : ''}` : ''}</span>
                      {b.googleLink && <a href={b.googleLink} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--brand-accent)' }}>📍 View on Maps</a>}
                    </div>
                    {b.notes && <div className="text-sm" style={{ marginTop: '0.375rem', color: 'var(--text-secondary)' }}>📝 {b.notes}</div>}
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }}
                      onClick={() => setExpandedComment(expandedComment === b.id ? null : b.id)}
                    >
                      {expandedComment === b.id ? '▲ Hide' : '💬 Discussion'}
                    </button>
                    {expandedComment === b.id && <CommentThread bookingId={b.id} type="custom" />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
