import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

interface SpecialDay {
  id: string;
  label: string;
  eventDate: string;
}

export default function SpecialDaysPage() {
  const [days, setDays] = useState<SpecialDay[]>([]);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDate, setEditDate] = useState('');

  const load = () =>
    api.get<SpecialDay[]>('/members/me/special-days').then((r) => setDays(r.data));

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.post('/members/me/special-days', { label, eventDate: date });
      setLabel(''); setDate('');
      load();
    } catch (err: any) {
      setAddError(err.response?.status === 422 ? 'You can only have up to 4 special days.' : 'Failed to add special day.');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/members/me/special-days/${id}`);
    load();
  };

  const startEdit = (day: SpecialDay) => {
    setEditId(day.id);
    setEditLabel(day.label);
    setEditDate(day.eventDate.slice(0, 10));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    await api.patch(`/members/me/special-days/${editId}`, { label: editLabel, eventDate: editDate });
    setEditId(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Special Days</h2>
        <p>Track up to 4 important dates — we'll help you celebrate them.</p>
      </div>

      <div className="card" style={{ maxWidth: 600, marginBottom: '1.5rem' }}>
        <h3 className="card-title">Add a Special Day</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 180px' }}>
            <label className="form-label">Label</label>
            <input
              className="form-input"
              placeholder="e.g. Birthday"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0.375rem' }}>Add</button>
        </form>
        {addError && <div className="alert alert-error mt-2">{addError}</div>}
      </div>

      {days.length === 0 ? (
        <p className="text-muted">No special days added yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.id}>
                  <td>
                    {day.label}
                  </td>
                  <td>
                    {new Date(day.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(day.id)}>Delete</button>
                    </div>
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
