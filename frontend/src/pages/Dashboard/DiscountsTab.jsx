import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API } from '../../config/api';

const formatDate = d => d ? new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : 'No expiry';

export default function DiscountsTab() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:'', type:'percentage', value:'', minOrder:'', maxUses:'', expiresAt:'' });

  useEffect(() => {
    API.get('/discounts').then(r => setDiscounts(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.value) return toast.error('Code and value required');
    try {
      const res = await API.post('/discounts', {
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        minOrder: parseFloat(form.minOrder) || 0,
        maxUses: parseInt(form.maxUses) || null,
        expiresAt: form.expiresAt || null
      });
      setDiscounts(p => [res.data, ...p]);
      toast.success('Discount code created!');
      setShowForm(false);
      setForm({ code:'', type:'percentage', value:'', minOrder:'', maxUses:'', expiresAt:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleToggle = async (d) => {
    try {
      const res = await API.put(`/discounts/${d._id}`, { isActive: !d.isActive });
      setDiscounts(p => p.map(x => x._id === d._id ? res.data : x));
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/discounts/${id}`);
      setDiscounts(p => p.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="discounts-tab fade-in">
      <div className="tab-toolbar">
        <div>
          <h3 className="tab-title">Discount Codes</h3>
          <p className="tab-sub">Create codes customers enter to get a discount on WhatsApp orders</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ New Code'}
        </button>
      </div>

      {showForm && (
        <div className="card discount-form-card fade-in">
          <form onSubmit={handleCreate}>
            <div className="form-row-3">
              <div className="form-group">
                <label>Code</label>
                <input name="code" value={form.code} onChange={handleChange} placeholder="e.g. SAVE10" style={{textTransform:'uppercase'}} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={form.type} onChange={handleChange}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                <input type="number" name="value" value={form.value} onChange={handleChange} placeholder={form.type === 'percentage' ? '10' : '500'} min="0" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Min Order (₦)</label>
                <input type="number" name="minOrder" value={form.minOrder} onChange={handleChange} placeholder="0 = no minimum" min="0" />
              </div>
              <div className="form-group">
                <label>Max Uses</label>
                <input type="number" name="maxUses" value={form.maxUses} onChange={handleChange} placeholder="Leave blank = unlimited" min="1" />
              </div>
              <div className="form-group">
                <label>Expires At</label>
                <input type="date" name="expiresAt" value={form.expiresAt} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--sm">Create Code</button>
          </form>
        </div>
      )}

      {discounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏷️</div>
          <h3>No discount codes yet</h3>
          <p>Create your first code to offer customers a deal</p>
        </div>
      ) : (
        <div className="card" style={{overflow:'auto'}}>
          <table className="data-table">
            <thead>
              <tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d._id}>
                  <td><code className="code-pill">{d.code}</code></td>
                  <td><strong>{d.type === 'percentage' ? `${d.value}%` : `₦${d.value.toLocaleString('en-NG')}`}</strong></td>
                  <td>{d.minOrder > 0 ? `₦${d.minOrder.toLocaleString('en-NG')}` : '—'}</td>
                  <td>{d.usedCount}{d.maxUses ? `/${d.maxUses}` : ''}</td>
                  <td><small>{formatDate(d.expiresAt)}</small></td>
                  <td>
                    <button className={`status-toggle ${d.isActive ? 'on' : 'off'}`} onClick={() => handleToggle(d)}>
                      {d.isActive ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn--danger btn--sm" onClick={() => handleDelete(d._id)}>🗑</button>
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
