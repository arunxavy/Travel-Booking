import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface Voucher {
  id: string;
  status: 'issued' | 'pending' | 'redeemed' | 'expired';
  issuedAt: string;
  expiresAt?: string;
  valueType: string;
  discountValue: string;
  isFlash: boolean;
}

interface WalletResponse {
  available: Voucher[];
  flash: Voucher[];
  pending: Voucher[];
  used: Voucher[];
  expired: Voucher[];
}

const TABS = ['available', 'flash', 'pending', 'used', 'expired'] as const;
type Tab = typeof TABS[number];

const TYPE_LABELS: Record<string, string> = {
  cashback: 'Cashback', seasonal: 'Seasonal', tier_locked: 'Tier Locked', free_night: 'Free Night',
};

const BORDER_COLORS: Record<Tab, string> = {
  available: '#0f4c81', flash: '#ef4444', pending: '#f59e0b', used: '#6b7280', expired: '#9ca3af',
};

function VoucherCard({ voucher, tab }: { voucher: Voucher; tab: Tab }) {
  return (
    <div className="voucher-card" style={{ borderLeftColor: BORDER_COLORS[tab] }}>
      <div className="flex items-center gap-2 mb-4" style={{ marginBottom: '0.375rem' }}>
        <span className="voucher-card-type">{TYPE_LABELS[voucher.valueType] ?? voucher.valueType}</span>
        {voucher.isFlash && <span className="badge badge-red">⚡ Flash</span>}
      </div>
      <div className="voucher-card-detail">Discount: {voucher.discountValue}</div>
      {voucher.expiresAt && (
        <div className="voucher-card-detail mt-1">
          Expires: {new Date(voucher.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

export default function VoucherWalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<WalletResponse>('/vouchers/me')
      .then((r) => setWallet(r.data))
      .catch(() => setError('Failed to load vouchers.'));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!wallet) return <div className="loading-screen">Loading…</div>;

  const tabVouchers = wallet[activeTab] ?? [];

  return (
    <div>
      <div className="page-header">
        <h2>Voucher Wallet</h2>
        <p>Your available discounts and rewards</p>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({(wallet[tab] ?? []).length})
          </button>
        ))}
      </div>

      {tabVouchers.length === 0 ? (
        <p className="text-muted">No vouchers in this category.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {tabVouchers.map((v) => <VoucherCard key={v.id} voucher={v} tab={activeTab} />)}
        </div>
      )}
    </div>
  );
}
