import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { inr } from '../../lib/format';

interface VoucherTemplate {
  id: string; valueType: string; discountValue: string; isFlash: boolean; flashHours: number | null;
}
interface Member { id: string; name: string; email: string; }
interface Tier { id: string; name: string; }

const VALUE_TYPE_LABELS: Record<string, string> = {
  cashback: 'Cashback', seasonal: 'Seasonal', tier_locked: 'Tier Locked',
  free_night: 'Free Night', fixed_amount: 'Fixed Amount',
};

function templateLabel(t: VoucherTemplate): string {
  const type = VALUE_TYPE_LABELS[t.valueType] ?? t.valueType;
  const val = t.valueType === 'fixed_amount' ? inr(t.discountValue) : t.discountValue;
  return `${type} — ${val}${t.isFlash ? ` ⚡${t.flashHours}h` : ''}`;
}

export default function VoucherAssignPage() {
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);

  const [singleMemberId, setSingleMemberId] = useState('');
  const [singleTemplateId, setSingleTemplateId] = useState('');
  const [singleMsg, setSingleMsg] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const [bulkTierId, setBulkTierId] = useState('');
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    api.get<VoucherTemplate[]>('/voucher-templates').then((r) => setTemplates(r.data));
    api.get<Member[]>('/members').then((r) => setMembers(r.data));
    api.get<Tier[]>('/members/tiers').then((r) => setTiers(r.data));
  }, []);

  const handleSingleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleMsg(null); setSingleError(null); setSingleLoading(true);
    try {
      await api.post('/vouchers/assign', { memberId: singleMemberId, templateId: singleTemplateId });
      setSingleMsg('Voucher assigned successfully.');
      setSingleMemberId(''); setSingleTemplateId('');
    } catch (err: any) {
      setSingleError(err.response?.data?.message ?? 'Assignment failed.');
    } finally { setSingleLoading(false); }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg(null); setBulkError(null); setBulkLoading(true);
    try {
      const res = await api.post<{ count: number }>('/vouchers/bulk-assign', { tierId: bulkTierId, templateId: bulkTemplateId });
      setBulkMsg(`Bulk assignment complete. ${res.data.count ?? ''} vouchers issued.`);
      setBulkTierId(''); setBulkTemplateId('');
    } catch (err: any) {
      setBulkError(err.response?.data?.message ?? 'Bulk assignment failed.');
    } finally { setBulkLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Voucher Assignment</h2>
        <p>Assign vouchers to individual members or entire tiers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 className="card-title">Single Assignment</h3>
          <form onSubmit={handleSingleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Member</label>
              <select className="form-select" value={singleMemberId} onChange={(e) => setSingleMemberId(e.target.value)} required>
                <option value="">Select a member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Voucher Template</label>
              <select className="form-select" value={singleTemplateId} onChange={(e) => setSingleTemplateId(e.target.value)} required>
                <option value="">Select a template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{templateLabel(t)}</option>)}
              </select>
            </div>
            {singleMsg && <div className="alert alert-success">{singleMsg}</div>}
            {singleError && <div className="alert alert-error">{singleError}</div>}
            <button type="submit" className="btn btn-primary" disabled={singleLoading} style={{ alignSelf: 'flex-start' }}>
              {singleLoading ? 'Assigning…' : 'Assign Voucher'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Bulk Assignment (by Tier)</h3>
          <form onSubmit={handleBulkAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-select" value={bulkTierId} onChange={(e) => setBulkTierId(e.target.value)} required>
                <option value="">Select a tier…</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Voucher Template</label>
              <select className="form-select" value={bulkTemplateId} onChange={(e) => setBulkTemplateId(e.target.value)} required>
                <option value="">Select a template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{templateLabel(t)}</option>)}
              </select>
            </div>
            {bulkMsg && <div className="alert alert-success">{bulkMsg}</div>}
            {bulkError && <div className="alert alert-error">{bulkError}</div>}
            <button type="submit" className="btn btn-primary" disabled={bulkLoading} style={{ alignSelf: 'flex-start' }}>
              {bulkLoading ? 'Assigning…' : 'Bulk Assign'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
