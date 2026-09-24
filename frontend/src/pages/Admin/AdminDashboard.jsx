import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdmin, ADMIN_API } from '../../context/AdminContext';
import './AdminPages.scss';

const formatCurrency = n => '₦' + Number(n).toLocaleString('en-NG');
const formatDate = d => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Stat Card ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }) => (
  <div className={`admin-stat-card admin-stat-card--${color || 'green'}`}>
    <p className="admin-stat-card__label">{label}</p>
    <h3 className="admin-stat-card__value">{value}</h3>
    {sub && <p className="admin-stat-card__sub">{sub}</p>}
  </div>
);

// ── Badge ───────────────────────────────────────────────────────────────
const PlanBadge = ({ plan, status }) => {
  const color = status === 'active' ? 'green' : status === 'trial' ? 'gold' : 'red';
  return <span className={`badge badge--${color}`}>{plan?.toUpperCase()}</span>;
};

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { admin, logout, ADMIN_API: api } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorTotal, setVendorTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterSuspended, setFilterSuspended] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    ADMIN_API.get('/admin/stats').then(r => setStats(r.data)).finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'vendors') return;
    setLoadingVendors(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (searchQ) params.set('search', searchQ);
    if (filterPlan) params.set('plan', filterPlan);
    if (filterSuspended) params.set('suspended', filterSuspended);
    ADMIN_API.get(`/admin/vendors?${params}`)
      .then(r => { setVendors(r.data.vendors); setVendorTotal(r.data.total); })
      .finally(() => setLoadingVendors(false));
  }, [activeTab, page, searchQ, filterPlan, filterSuspended]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadVendorDetail = async (id) => {
    setSelectedVendor(id);
    setLoadingDetail(true);
    setActiveTab('vendor-detail');
    try {
      const r = await ADMIN_API.get(`/admin/vendors/${id}`);
      setVendorDetail(r.data);
    } catch { toast.error('Failed to load vendor'); }
    finally { setLoadingDetail(false); }
  };

  const handleSuspend = async (vendorId, suspend, reason = '') => {
    try {
      await ADMIN_API.patch(`/admin/vendors/${vendorId}/suspend`, { suspend, reason });
      toast.success(suspend ? 'Vendor suspended' : 'Vendor reinstated');
      setConfirmAction(null);
      // Refresh
      if (activeTab === 'vendor-detail') {
        const r = await ADMIN_API.get(`/admin/vendors/${vendorId}`);
        setVendorDetail(r.data);
      } else {
        setPage(p => p); // trigger re-fetch
      }
    } catch { toast.error('Action failed'); }
  };

  const handleOverrideSubscription = async (vendorId, plan, status, days) => {
    try {
      await ADMIN_API.patch(`/admin/vendors/${vendorId}/subscription`, {
        plan, status, daysFromNow: parseInt(days)
      });
      toast.success('Subscription updated');
      const r = await ADMIN_API.get(`/admin/vendors/${vendorId}`);
      setVendorDetail(r.data);
    } catch { toast.error('Failed'); }
  };

  const handleImpersonate = async (vendorId) => {
    try {
      const r = await ADMIN_API.post(`/admin/vendors/${vendorId}/impersonate`);
      // Open vendor dashboard in new tab with impersonation token
      const url = `/dashboard?impersonate=${r.data.token}`;
      window.open(url, '_blank');
      toast.success('Opening vendor dashboard...');
    } catch { toast.error('Impersonation failed'); }
  };

  const handleDelete = async (vendorId) => {
    try {
      await ADMIN_API.delete(`/admin/vendors/${vendorId}`);
      toast.success('Vendor deleted');
      setConfirmAction(null);
      setActiveTab('vendors');
    } catch { toast.error('Delete failed'); }
  };

  const handleLogout = () => { logout(); navigate('/admin'); };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'vendors', label: '🏪 Vendors' },
    { id: 'orders', label: '🧾 Orders' },
  ];

  return (
    <div className="admin-dashboard">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="brand-v">V</span>
          <span>Admin</span>
        </div>
        <nav className="admin-sidebar__nav">
          {tabs.map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id || (activeTab === 'vendor-detail' && t.id === 'vendors') ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setVendorDetail(null); }}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={handleLogout}>↩ Log Out</button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-topbar__title">
            {activeTab === 'overview' ? 'Platform Overview'
              : activeTab === 'vendors' ? 'Vendors'
              : activeTab === 'vendor-detail' ? '← Vendor Detail'
              : 'Orders'}
          </h1>
          <span className="admin-topbar__user">👤 {admin?.email}</span>
        </header>

        <div className="admin-content">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="fade-in">
              {loadingStats ? <div className="page-loader"><div className="spinner" /></div> : (
                <>
                  <div className="admin-stats-grid">
                    <StatCard label="Total Vendors" value={stats?.vendors?.total} sub={`+${stats?.vendors?.new30d} last 30d`} color="green" />
                    <StatCard label="Active Vendors" value={stats?.vendors?.active} color="green" />
                    <StatCard label="Suspended" value={stats?.vendors?.suspended} color="red" />
                    <StatCard label="Paid Subscribers" value={stats?.subscriptions?.paid} sub={`${stats?.subscriptions?.trial} on trial`} color="gold" />
                    <StatCard label="Est. MRR" value={formatCurrency(stats?.subscriptions?.estimatedMRR || 0)} color="gold" />
                    <StatCard label="Total Orders" value={stats?.content?.totalOrders} sub={`${stats?.content?.orders30d} last 30d`} color="green" />
                    <StatCard label="Starter Plans" value={stats?.subscriptions?.starter} color="green" />
                    <StatCard label="Pro Plans" value={stats?.subscriptions?.pro} color="green" />
                  </div>

                  <div className="admin-card" style={{ marginTop: 24 }}>
                    <h3>Quick Actions</h3>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                      <button className="btn btn--primary" onClick={() => setActiveTab('vendors')}>Manage Vendors</button>
                      <button className="btn btn--outline" onClick={() => setActiveTab('orders')}>View All Orders</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VENDORS LIST */}
          {activeTab === 'vendors' && (
            <div className="fade-in">
              <div className="admin-toolbar">
                <input
                  className="admin-search"
                  placeholder="🔍 Search by name, email, slug..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select className="admin-filter" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                  <option value="">All Plans</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                </select>
                <select className="admin-filter" value={filterSuspended} onChange={e => setFilterSuspended(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="true">Suspended</option>
                </select>
                <span className="admin-count">{vendorTotal} vendors</span>
              </div>

              {loadingVendors ? <div className="page-loader"><div className="spinner" /></div> : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Store</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Products</th>
                        <th>Orders</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map(v => (
                        <tr key={v._id} className={v.isSuspended ? 'row--suspended' : ''}>
                          <td>
                            <div className="vendor-cell">
                              <div className="vendor-cell__avatar">{v.storeName[0]}</div>
                              <div>
                                <strong>{v.storeName}</strong>
                                <br /><small>@{v.storeSlug}</small>
                              </div>
                            </div>
                          </td>
                          <td><small>{v.email}</small></td>
                          <td><PlanBadge plan={v.subscription?.plan} status={v.subscription?.status} /></td>
                          <td>{v.productCount}</td>
                          <td>{v.orderCount}</td>
                          <td><small>{formatDate(v.createdAt)}</small></td>
                          <td>
                            {v.isSuspended
                              ? <span className="badge badge--red">Suspended</span>
                              : <span className="badge badge--green">Active</span>}
                          </td>
                          <td>
                            <div className="action-btns">
                              <button className="btn btn--outline btn--sm" onClick={() => loadVendorDetail(v._id)}>View</button>
                              <a href={`/store/${v.storeSlug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Store</a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="admin-pagination">
                <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span>Page {page} of {Math.ceil(vendorTotal / 20) || 1}</span>
                <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(vendorTotal / 20)}>Next →</button>
              </div>
            </div>
          )}

          {/* VENDOR DETAIL */}
          {activeTab === 'vendor-detail' && (
            <div className="fade-in">
              <button className="btn btn--ghost btn--sm" style={{ marginBottom: 20 }}
                onClick={() => { setActiveTab('vendors'); setVendorDetail(null); }}>
                ← Back to Vendors
              </button>

              {loadingDetail ? <div className="page-loader"><div className="spinner" /></div> : vendorDetail && (
                <VendorDetailPanel
                  data={vendorDetail}
                  onSuspend={handleSuspend}
                  onOverride={handleOverrideSubscription}
                  onImpersonate={handleImpersonate}
                  onDelete={(id) => setConfirmAction({ type: 'delete', id })}
                  confirmAction={confirmAction}
                  setConfirmAction={setConfirmAction}
                  onConfirmDelete={handleDelete}
                />
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && <AdminOrdersTab />}
        </div>
      </main>

      {/* CONFIRM MODAL */}
      {confirmAction?.type === 'delete' && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Delete Vendor?</h3>
              <button className="close-btn" onClick={() => setConfirmAction(null)}>✕</button>
            </div>
            <div className="modal__body">
              <p style={{ color: 'var(--gray-600)', marginBottom: 20 }}>
                This will soft-delete the vendor and hide all their products. This action can be reversed in the database.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => handleDelete(confirmAction.id)}>Delete Vendor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vendor Detail Panel ────────────────────────────────────────────────────
function VendorDetailPanel({ data, onSuspend, onOverride, onImpersonate, onDelete }) {
  const { vendor, products, orders, stats } = data;
  const [subForm, setSubForm] = useState({ plan: vendor.subscription?.plan, status: vendor.subscription?.status, days: 30 });
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);

  return (
    <div className="vendor-detail">
      <div className="vendor-detail__header">
        <div className="vendor-detail__avatar">{vendor.storeName[0]}</div>
        <div>
          <h2>{vendor.storeName}</h2>
          <p>{vendor.email} · @{vendor.storeSlug}</p>
          {vendor.isSuspended && (
            <span className="badge badge--red" style={{ marginTop: 4 }}>
              SUSPENDED: {vendor.suspendedReason}
            </span>
          )}
        </div>
        <div className="vendor-detail__actions">
          <button className="btn btn--outline btn--sm" onClick={() => onImpersonate(vendor._id)}>
            👤 Impersonate
          </button>
          <a href={`/store/${vendor.storeSlug}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            👁 View Store
          </a>
          <button className="btn btn--danger btn--sm" onClick={() => onDelete(vendor._id)}>
            🗑 Delete
          </button>
        </div>
      </div>

      <div className="vendor-detail__grid">
        {/* Stats */}
        <div className="admin-card">
          <h4>Stats</h4>
          <div className="detail-stats">
            <div><span>Products</span><strong>{stats.totalProducts}</strong></div>
            <div><span>Orders</span><strong>{stats.totalOrders}</strong></div>
            <div><span>Location</span><strong>{vendor.location || '—'}</strong></div>
            <div><span>WhatsApp</span><strong>{vendor.whatsappNumber}</strong></div>
            <div><span>Joined</span><strong>{new Date(vendor.createdAt).toLocaleDateString('en-NG')}</strong></div>
            <div><span>Referrals</span><strong>{vendor.referralCount || 0}</strong></div>
          </div>
        </div>

        {/* Subscription Control */}
        <div className="admin-card">
          <h4>Subscription Control</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0' }}>
            <PlanBadge plan={vendor.subscription?.plan} status={vendor.subscription?.status} />
            <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>
              Expires: {vendor.subscription?.expiresAt ? new Date(vendor.subscription.expiresAt).toLocaleDateString('en-NG') : '—'}
            </span>
          </div>
          <div className="sub-override-form">
            <select value={subForm.plan} onChange={e => setSubForm(p => ({ ...p, plan: e.target.value }))}>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
            <select value={subForm.status} onChange={e => setSubForm(p => ({ ...p, status: e.target.value }))}>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
            <input type="number" value={subForm.days} min="1" max="365"
              onChange={e => setSubForm(p => ({ ...p, days: e.target.value }))}
              placeholder="Days" style={{ width: 70 }} />
            <button className="btn btn--primary btn--sm"
              onClick={() => onOverride(vendor._id, subForm.plan, subForm.status, subForm.days)}>
              Apply
            </button>
          </div>
        </div>

        {/* Suspend/Reinstate */}
        <div className="admin-card">
          <h4>{vendor.isSuspended ? 'Reinstate Vendor' : 'Suspend Vendor'}</h4>
          {!vendor.isSuspended && (
            <>
              {showSuspendForm ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    style={{ width: '100%', marginBottom: 8, padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 8, fontFamily: 'var(--font-body)' }}
                    placeholder="Reason for suspension..."
                    value={suspendReason}
                    onChange={e => setSuspendReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--danger btn--sm" onClick={() => onSuspend(vendor._id, true, suspendReason)}>
                      Confirm Suspend
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setShowSuspendForm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn--danger btn--sm" style={{ marginTop: 12 }}
                  onClick={() => setShowSuspendForm(true)}>
                  ⚠️ Suspend Account
                </button>
              )}
            </>
          )}
          {vendor.isSuspended && (
            <button className="btn btn--primary btn--sm" style={{ marginTop: 12 }}
              onClick={() => onSuspend(vendor._id, false)}>
              ✅ Reinstate Account
            </button>
          )}
        </div>

        {/* Recent Products */}
        <div className="admin-card admin-card--wide">
          <h4>Recent Products ({stats.totalProducts} total)</h4>
          <div className="mini-list">
            {products.slice(0, 8).map(p => (
              <div key={p._id} className="mini-list__item">
                <span>{p.name}</span>
                <span style={{ color: 'var(--green-deep)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ₦{p.price?.toLocaleString('en-NG')}
                </span>
              </div>
            ))}
            {!products.length && <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>No products yet</p>}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="admin-card admin-card--wide">
          <h4>Recent Orders ({stats.totalOrders} total)</h4>
          <div className="mini-list">
            {orders.slice(0, 8).map(o => (
              <div key={o._id} className="mini-list__item">
                <span>{o.productName}</span>
                <span className={`badge badge--${o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'gold'}`} style={{ fontSize: '0.72rem' }}>
                  {o.status}
                </span>
              </div>
            ))}
            {!orders.length && <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem' }}>No orders yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Orders Tab ────────────────────────────────────────────────────────
function AdminOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    ADMIN_API.get(`/admin/orders?page=${page}&limit=25`)
      .then(r => { setOrders(r.data.orders); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}><strong>{total}</strong> total orders across all vendors</div>
      {loading ? <div className="page-loader"><div className="spinner" /></div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Store</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id}>
                  <td>{o.productName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>₦{o.productPrice?.toLocaleString('en-NG')}</td>
                  <td>{o.vendor?.storeName || '—'}</td>
                  <td><span className={`badge badge--${o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'gold'}`}>{o.status}</span></td>
                  <td><small>{new Date(o.createdAt).toLocaleDateString('en-NG')}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-pagination">
        <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
        <span>Page {page} of {Math.ceil(total / 25) || 1}</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 25)}>Next →</button>
      </div>
    </div>
  );
}
