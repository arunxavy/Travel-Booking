import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { inr } from '../../lib/format';

interface Package {
  id: string; title: string; location: string; category: string; price: string;
  numberOfDays: number | null; itinerary: string | null; included: string | null; excluded: string | null;
  isFeatured: boolean;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [wishlistMsg, setWishlistMsg] = useState<{ id: string; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const search = useCallback(() => {
    const params: Record<string, string> = {};
    if (location) params.location = location;
    if (category) params.category = category;
    if (maxPrice) params.maxPrice = maxPrice;
    api.get<Package[]>('/packages', { params }).then((r) => setPackages(r.data));
  }, [location, category, maxPrice]);

  useEffect(() => { search(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); search(); };

  const addToWishlist = async (pkg: Package) => {
    try {
      const res = await api.post(`/wishlist/${pkg.id}`);
      setWishlistMsg({ id: pkg.id, msg: res.data?.alreadySaved ? 'Already saved' : 'Added to wishlist!' });
    } catch (err: any) {
      setWishlistMsg({ id: pkg.id, msg: (err.response?.status === 409 || err.response?.data?.alreadySaved) ? 'Already saved' : 'Failed to add.' });
    }
    setTimeout(() => setWishlistMsg(null), 2500);
  };

  const featured = packages.filter((p) => p.isFeatured);
  const regular = packages.filter((p) => !p.isFeatured);

  return (
    <div>
      <div className="page-header">
        <h2>Browse Packages</h2>
        <p>Discover your next holiday adventure</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="e.g. Goa" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Category</label>
            <input className="form-input" placeholder="e.g. Beach" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Max Price (₹)</label>
            <input type="number" className="form-input" placeholder="e.g. 50000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0.375rem' }}>Search</button>
          <button type="button" className="btn btn-outline" style={{ marginBottom: '0.375rem' }} onClick={() => { setLocation(''); setCategory(''); setMaxPrice(''); }}>Clear</button>
        </form>
      </div>

      {packages.length === 0 && <p className="text-muted">No packages found.</p>}

      {featured.length > 0 && (
        <div className="section">
          <div className="section-title">⭐ Featured</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {featured.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onAdd={addToWishlist}
                toast={wishlistMsg?.id === pkg.id ? wishlistMsg.msg : null}
                expanded={expanded === pkg.id} onToggle={() => setExpanded(expanded === pkg.id ? null : pkg.id)} />
            ))}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div className="section">
          {featured.length > 0 && <div className="section-title">All Packages</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {regular.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onAdd={addToWishlist}
                toast={wishlistMsg?.id === pkg.id ? wishlistMsg.msg : null}
                expanded={expanded === pkg.id} onToggle={() => setExpanded(expanded === pkg.id ? null : pkg.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg, onAdd, toast, expanded, onToggle }: {
  pkg: Package; onAdd: (pkg: Package) => Promise<void>; toast: string | null;
  expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="pkg-card">
      <div className="pkg-card-title">
        {pkg.title}
        {pkg.isFeatured && <span className="badge badge-featured">Featured</span>}
      </div>
      <div className="pkg-card-meta">
        📍 {pkg.location} · {pkg.category}
        {pkg.numberOfDays && <span> · {pkg.numberOfDays} days</span>}
      </div>
      <div className="pkg-card-price">{inr(pkg.price)}</div>

      {expanded && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {pkg.itinerary && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Itinerary:</strong>
              <p style={{ whiteSpace: 'pre-line', margin: '0.25rem 0 0' }}>{pkg.itinerary}</p>
            </div>
          )}
          {pkg.included && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--success-text)' }}>✓ Included:</strong>
              <p style={{ whiteSpace: 'pre-line', margin: '0.25rem 0 0' }}>{pkg.included}</p>
            </div>
          )}
          {pkg.excluded && (
            <div>
              <strong style={{ color: 'var(--error-text)' }}>✗ Excluded:</strong>
              <p style={{ whiteSpace: 'pre-line', margin: '0.25rem 0 0' }}>{pkg.excluded}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="btn btn-outline btn-sm" onClick={() => onAdd(pkg)}>+ Wishlist</button>
        {(pkg.itinerary || pkg.included || pkg.excluded) && (
          <button className="btn btn-ghost btn-sm" style={{ background: 'transparent', color: 'var(--brand-accent)', border: 'none', padding: '0.3rem 0.5rem' }} onClick={onToggle}>
            {expanded ? '▲ Less' : '▼ Details'}
          </button>
        )}
        {toast && <span className={`badge ${toast === 'Already saved' ? 'badge-yellow' : 'badge-green'}`}>{toast}</span>}
      </div>
    </div>
  );
}
