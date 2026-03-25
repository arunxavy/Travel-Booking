import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { inr } from '../../lib/format';

interface WishlistEntry {
  id: string;
  packageId: string;
  savedAt: string;
  package: { id: string; title: string; location: string; category: string; price: string; };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.get<WishlistEntry[]>('/wishlist')
      .then((r) => setItems(r.data))
      .catch(() => setError('Failed to load wishlist.'));

  useEffect(() => { load(); }, []);

  const handleRemove = async (packageId: string) => {
    await api.delete(`/wishlist/${packageId}`);
    load();
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>My Wishlist</h2>
        <p>Packages you've saved for later</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌴</div>
          <p className="text-muted">Your wishlist is empty. Browse packages to add some!</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Location</th>
                <th>Category</th>
                <th>Price</th>
                <th>Saved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.package?.title ?? item.packageId}</td>
                  <td className="text-muted">📍 {item.package?.location ?? '—'}</td>
                  <td>{item.package?.category ?? '—'}</td>
                  <td className="font-semibold" style={{ color: 'var(--brand-primary)' }}>{inr(item.package?.price ?? '0')}</td>
                  <td className="text-muted text-sm">{new Date(item.savedAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(item.packageId)}>Remove</button>
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
