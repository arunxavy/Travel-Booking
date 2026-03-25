import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { inr } from '../../lib/format';

interface Package {
  id: string; title: string; location: string; category: string; price: string;
  numberOfDays: number | null; itinerary: string | null; included: string | null; excluded: string | null;
  isFeatured: boolean;
}

const emptyForm = { title: '', location: '', category: '', price: '', numberOfDays: '', itinerary: '', included: '', excluded: '', isFeatured: false };

function PackageForm({
  values, onChange, onSubmit, submitLabel, loading, msg, error,
}: {
  values: typeof emptyForm;
  onChange: (k: keyof typeof emptyForm, v: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string; loading: boolean; msg: string | null; error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input type="text" className="form-input" value={values.title} onChange={(e) => onChange('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input type="text" className="form-input" value={values.location} onChange={(e) => onChange('location', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <input type="text" className="form-input" value={values.category} onChange={(e) => onChange('category', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Price (₹)</label>
          <input type="number" min="0" step="0.01" className="form-input" value={values.price} onChange={(e) => onChange('price', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Number of Days</label>
          <input type="number" min="1" className="form-input" value={values.numberOfDays} onChange={(e) => onChange('numberOfDays', e.target.value)} placeholder="e.g. 7" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Itinerary</label>
        <textarea className="form-input" rows={3} value={values.itinerary} onChange={(e) => onChange('itinerary', e.target.value)} placeholder="Day 1: Arrive in Goa..." style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">What's Included</label>
          <textarea className="form-input" rows={3} value={values.included} onChange={(e) => onChange('included', e.target.value)} placeholder="Flights, Hotel, Breakfast..." style={{ resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label className="form-label">What's Excluded</label>
          <textarea className="form-input" rows={3} value={values.excluded} onChange={(e) => onChange('excluded', e.target.value)} placeholder="Visa fees, Personal expenses..." style={{ resize: 'vertical' }} />
        </div>
      </div>
      <label className="form-checkbox-row">
        <input type="checkbox" checked={values.isFeatured} onChange={(e) => onChange('isFeatured', e.target.checked)} />
        <span className="form-label" style={{ margin: 0 }}>Featured Package</span>
      </label>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

export default function PackageManagementPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPackages = async () => {
    try { setPackages((await api.get<Package[]>('/packages')).data); }
    catch (err: any) { setLoadError(err.response?.data?.message ?? 'Failed to load packages.'); }
  };

  useEffect(() => { loadPackages(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null); setCreateError(null); setCreating(true);
    try {
      const res = await api.post<Package>('/packages', {
        title: createForm.title, location: createForm.location, category: createForm.category,
        price: parseFloat(createForm.price), isFeatured: createForm.isFeatured,
        numberOfDays: createForm.numberOfDays ? parseInt(createForm.numberOfDays) : undefined,
        itinerary: createForm.itinerary || undefined,
        included: createForm.included || undefined,
        excluded: createForm.excluded || undefined,
      });
      setCreateMsg(`Package "${res.data.title}" created.`);
      setCreateForm({ ...emptyForm });
      setPackages((prev) => [res.data, ...prev]);
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? 'Failed to create package.');
    } finally { setCreating(false); }
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setEditForm({
      title: pkg.title, location: pkg.location, category: pkg.category, price: pkg.price,
      numberOfDays: pkg.numberOfDays?.toString() ?? '', itinerary: pkg.itinerary ?? '',
      included: pkg.included ?? '', excluded: pkg.excluded ?? '', isFeatured: pkg.isFeatured,
    });
    setEditMsg(null); setEditError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditMsg(null); setEditError(null); setSaving(true);
    try {
      const res = await api.patch<Package>(`/packages/${editing.id}`, {
        title: editForm.title, location: editForm.location, category: editForm.category,
        price: parseFloat(editForm.price), isFeatured: editForm.isFeatured,
        numberOfDays: editForm.numberOfDays ? parseInt(editForm.numberOfDays) : null,
        itinerary: editForm.itinerary || null,
        included: editForm.included || null,
        excluded: editForm.excluded || null,
      });
      setEditMsg('Package updated.');
      setEditing(res.data);
      setPackages((prev) => prev.map((p) => (p.id === res.data.id ? res.data : p)));
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? 'Failed to update package.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Package Management</h2>
        <p>Create and manage holiday packages</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title">Create Package</h3>
        <PackageForm
          values={createForm}
          onChange={(k, v) => setCreateForm((f) => ({ ...f, [k]: v }))}
          onSubmit={handleCreate}
          submitLabel="Create Package"
          loading={creating}
          msg={createMsg}
          error={createError}
        />
      </div>

      {loadError && <div className="alert alert-error mb-4">{loadError}</div>}

      {packages.length === 0 && !loadError ? (
        <p className="text-muted">No packages yet.</p>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Location</th><th>Category</th><th>Days</th><th>Price</th><th>Featured</th><th></th></tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.title}</td>
                  <td className="text-muted">📍 {p.location}</td>
                  <td>{p.category}</td>
                  <td className="text-muted">{p.numberOfDays ? `${p.numberOfDays}D` : '—'}</td>
                  <td className="font-semibold" style={{ color: 'var(--brand-primary)' }}>{inr(p.price)}</td>
                  <td>{p.isFeatured ? <span className="badge badge-featured">★ Featured</span> : <span className="text-muted">—</span>}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="card">
          <div className="flex items-center justify-between mb-4" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Edit: {editing.title}</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>✕ Close</button>
          </div>
          <PackageForm
            values={editForm}
            onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))}
            onSubmit={handleSave}
            submitLabel="Save Changes"
            loading={saving}
            msg={editMsg}
            error={editError}
          />
        </div>
      )}
    </div>
  );
}
