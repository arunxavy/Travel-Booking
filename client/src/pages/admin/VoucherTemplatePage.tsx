import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { inr } from '../../lib/format';

interface Tier { id: string; name: string; }
interface VoucherTemplate {
  id: string; valueType: string; discountValue: string;
  isFlash: boolean; flashHours: number | null; tierRestriction: string | null; createdAt: string;
}

type ValueType = 'cashback' | 'seasonal' | 'tier_locked' | 'free_night' | 'fixed_amount';

const VALUE_TYPES: { value: ValueType; label: string; hint: string }[] = [
  { value: 'cashback', label: 'Cashback', hint: 'Percentage cashback' },
  { value: 'seasonal', label: 'Seasonal', hint: 'Seasonal discount' },
  { value: 'tier_locked', label: 'Tier Locked', hint: 'Restricted to a tier' },
  { value: 'free_night', label: 'Free Night', hint: 'Complimentary night' },
  { value: 'fixed_amount', label: 'Fixed Amount (₹)', hint: 'Fixed INR discount' },
];

export default function VoucherTemplatePage() {
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tiersLoaded, setTiersLoaded] = useState(false);

  const [valueType, setValueType] = useState<ValueType>('cashback');
  const [discountValue, setDiscountValue] = useState('');
  const [tierId, setTierId] = useState('');
  const [isFlash, setIsFlash] = useState(false);
  const [flashHours, setFlashHours] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTemplates = () =>
    api.get<VoucherTemplate[]>('/voucher-templates').then((r) => setTemplates(r.data));

  useEffect(() => { loadTemplates(); }, []);

  const loadTiers = async () => {
    if (tiersLoaded) return;
    try {
      const res = await api.get<Tier[]>('/members/tiers');
      setTiers(res.data); setTiersLoaded(true);
    } catch { /* non-critical */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null); setError(null); setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        valueType,
        discountValue: discountValue ? parseFloat(discountValue) : undefined,
        isFlash,
      };
      if (tierId) payload.tierId = tierId;
      if (isFlash && flashHours) payload.flashHours = parseInt(flashHours, 10);
      await api.post('/voucher-templates', payload);
      setSuccessMsg('Template created successfully.');
      setDiscountValue(''); setTierId(''); setIsFlash(false); setFlashHours('');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create template.');
    } finally {
      setLoading(false);
    }
  };

  const formatDiscount = (t: VoucherTemplate) => {
    if (t.valueType === 'fixed_amount') return inr(t.discountValue);
    if (t.valueType === 'free_night') return 'Free Night';
    return `${t.discountValue}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Voucher Template Management</h2>
        <p>Create voucher templates to assign to members</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card">
          <h3 className="card-title">Create Template</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Value Type</label>
              <select className="form-select" value={valueType} onChange={(e) => setValueType(e.target.value as ValueType)}>
                {VALUE_TYPES.map((vt) => <option key={vt.value} value={vt.value}>{vt.label} — {vt.hint}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                {valueType === 'fixed_amount' ? 'Amount (₹)' : 'Discount Value'}
              </label>
              <input
                type="number" min="0" step="0.01" className="form-input"
                value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={valueType === 'fixed_amount' ? 'e.g. 500' : 'e.g. 10 or 0.15'}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tier Restriction (optional)</label>
              <select className="form-select" value={tierId} onChange={(e) => setTierId(e.target.value)} onFocus={loadTiers}>
                <option value="">— No restriction —</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <label className="form-checkbox-row">
              <input type="checkbox" checked={isFlash} onChange={(e) => setIsFlash(e.target.checked)} />
              <span className="form-label" style={{ margin: 0 }}>Flash Voucher</span>
            </label>
            {isFlash && (
              <div className="form-group">
                <label className="form-label">Flash Duration (hours)</label>
                <input type="number" min="1" className="form-input" value={flashHours} onChange={(e) => setFlashHours(e.target.value)} required={isFlash} placeholder="e.g. 24" />
              </div>
            )}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              {loading ? 'Creating…' : 'Create Template'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Existing Templates</h3>
          {templates.length === 0 ? (
            <p className="text-muted text-sm">No templates yet.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead><tr><th>Type</th><th>Value</th><th>Flash</th></tr></thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td>{VALUE_TYPES.find((v) => v.value === t.valueType)?.label ?? t.valueType}</td>
                    <td className="font-semibold">{formatDiscount(t)}</td>
                    <td>{t.isFlash ? <span className="badge badge-red">⚡ {t.flashHours}h</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
