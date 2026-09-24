import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API, axiosInstance } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import ProductFormModal from '../components/ProductFormModal';
import Sidebar from '../components/Sidebar/Sidebar';
import AnalyticsChart from '../components/Analytics/AnalyticsChart';
import Onboarding from '../components/Onboarding/Onboarding';
import { ProductsGridSkeleton } from '../components/Skeleton/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import DiscountsTab from './Dashboard/DiscountsTab';
import ReviewsTab from './Dashboard/ReviewsTab';
import ToolsTab from './Dashboard/ToolsTab';
import EmailVerificationBanner from '../components/EmailVerificationBanner/EmailVerificationBanner';
import { BASE_URL } from '../config/api';
import { domain } from '../../../shared/data/domain';
import './DashboardPage.scss';
import './Dashboard/TabStyles.scss';


const API_BASE =  BASE_URL;
const IMG_BASE = API_BASE.replace('/api', '');

const resolveImg = (src) => src?.startsWith('/') ? `${IMG_BASE}${src}` : src;

const formatPrice = (n) => '₦' + Number(n).toLocaleString('en-NG');

// ── Subscription Banner ───────────────────────────────────────────────────
const SubscriptionBanner = ({ subscription, onUpgrade }) => {
  const daysLeft = subscription?.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt) - Date.now()) / 86400000))
    : 0;

   const isExpired = subscription?.status === 'expired' || daysLeft === 0;
  const isTrial = subscription?.status === 'trial';

  const color = subscription?.plan === 'pro' || subscription?.plan === 'starter' ? 'green'
    : isTrial ? 'gold' : isExpired ? 'red' : 'gray';

  const label = isTrial ? `Free Trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
    : isExpired ? 'Plan Expired — Renew to keep selling'
    : `${subscription?.plan?.toUpperCase()} — Active`;

 
  return (
    <div className={`sub-banner sub-banner--${color}`}>
      <div className="sub-banner__info">
        <span className={`badge badge--${color === 'green' ? 'green' : color === 'gold' ? 'gold' : color === 'red' ? 'red' : 'gray'}`}>
          {subscription?.plan?.toUpperCase() || 'FREE'}
        </span>
        <span className="sub-banner__status">{label}</span>
      </div>
      {(isExpired || isTrial) && (
        <button className="btn btn--gold btn--sm" onClick={onUpgrade}>
          {isExpired ? '⚠️ Renew Now' : '⬆️ Upgrade Plan'}
        </button>
      )}
    </div>
  );
};


// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { vendor, logout, updateVendor, API: api } = useAuth();
  const navigate = useNavigate();
  const {dark, toggle: toggleDark } = useTheme();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);

  const storeUrl = `${window.location.origin}/store/${vendor?.storeSlug}`;

  // Handle redirect after payment
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      const plan = searchParams.get('plan');
      toast.success(`${plan?.toUpperCase()} plan activated! 🎉`);
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.getProducts();
      setProducts(res.data);
    } catch (err) { toast.error('Failed to load products');} 
      finally { setLoadingProducts(false); }
  };

  //New
  const handleSearch = (e) => {
    setSearch(e.target.value);
    console.log(e.target.value)
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(() => fetchProducts(e.target.value), 350);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.deleteProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleToggleVisibility = async (product) => {
    try {
      const formData = new FormData();
      formData.append('isVisible', String(!product.isVisible));
      formData.append('keepImages', 'true');
      const res = await axiosInstance.updateProduct(product._id, formData);
      setProducts(prev => prev.map(p => p._id === product._id ? res.data : p));
    } catch {}
  };

   const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      await API.delete('/products/bulk', { data: { ids: selectedIds } });
      setProducts(prev => prev.filter(p => !selectedIds.includes(p._id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} products deleted`);
    } catch { toast.error('Bulk delete failed'); }
  };

  const handleModalSuccess = (saved) => {
    if (editProduct) {
      setProducts(prev => prev.map(p => p._id === saved._id ? saved : p));
    } else {
      setProducts(prev => [saved, ...prev]);
    }
    setShowModal(false);
    setEditProduct(null);
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Drag-and-drop reorder
  const handleDragStart = (e, index) => {
    dragItem.current = index;
    setDragging(index);
    e.dataTransfer.effectAllowed = 'move';
    
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    const from = dragItem.current;
    if (from === targetIndex) { setDragging(null); setDragOver(null); return; }

    const reordered = [...products];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((p, i) => ({ ...p, sortOrder: i }));
    setProducts(withOrder);
    setDragging(null);
    setDragOver(null);

    try {
      await API.patch('/products/reorder', {
        order: withOrder.map(p => ({ id: p._id, sortOrder: p.sortOrder }))
      });
    } catch { toast.error('Failed to save order'); }
  }

  const copyStoreLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success('Store link copied!');
  };
 
  const tabTitle = { products: 'My Products', orders: 'Orders', analytics: 'Analytics', store: 'Store Profile', subscription: 'Subscription' };

 return (
    <div className="dashboard">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="dashboard__main">
        {/* TOP BAR */}
        <header className="dash-topbar">
          <button
            className="dash-topbar__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="dash-topbar__title">
            <h1>{tabTitle[activeTab]}</h1>
          </div>
          <div className="dash-topbar__actions">
            <button
              className="dark-toggle"
              onClick={toggleDark}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <div className="store-link-box">
              <span className="store-link-box__url">{storeUrl.replace('http://', '')}</span>
              <button onClick={copyStoreLink} className="btn btn--outline btn--sm">Copy</button>
            </div>
            {activeTab === 'products' && (
              <button className="btn btn--primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
                + Add Product
              </button>
            )}
          </div>
        </header>

        <div className="dash-content">
          {/* Onboarding */}
          <Onboarding onNavigate={setActiveTab} />

          {/* Email verification banner */}
          {vendor && !vendor.isEmailVerified && (
            <EmailVerificationBanner email={vendor.email} />
          )}

          {/* Subscription banner */}
          {vendor?.subscription && (
            <SubscriptionBanner
              subscription={vendor.subscription}
              onUpgrade={() => setActiveTab('subscription')}
            />
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="fade-in">
              <div className="products-toolbar">
                <input
                  className="products-search"
                  placeholder="🔍  Search products..."
                  value={search}
                  onChange={handleSearch}
                />
                {selectedIds.length > 0 && (
                  <button className="btn btn--danger btn--sm" onClick={handleBulkDelete}>
                    🗑 Delete {selectedIds.length} selected
                  </button>
                )}
                <span className="products-count">{products.length} product{products.length !== 1 ? 's' : ''}</span>
              </div>

              {loadingProducts ? (
                <ProductsGridSkeleton count={6} />
              ) : products.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">{search ? '🔍' : '📦'}</div>
                  <h3>{search ? 'No products match' : 'No products yet'}</h3>
                  <p>{search ? `No results for "${search}"` : 'Add your first product to start selling'}</p>
                  {!search && (
                    <button className="btn btn--primary" onClick={() => setShowModal(true)}>+ Add First Product</button>
                  )}
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((product, index) => (
                    <div
                      key={product._id}
                      className={`product-card
                        ${!product.isVisible ? 'product-card--hidden' : ''}
                        ${selectedIds.includes(product._id) ? 'product-card--selected' : ''}
                        ${dragging === index ? 'product-card--dragging' : ''}
                        ${dragOver === index ? 'product-card--dragover' : ''}
                      `}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    >
                      <div className="product-card__select">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product._id)}
                          onChange={() => toggleSelect(product._id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="drag-handle" title="Drag to reorder">⠿</span>
                      </div>
                      <div className="product-card__img">
                        {product.images?.[0]
                          ? <img src={resolveImg(product.images[0])} alt={product.name} />
                          : <span className="product-card__placeholder">📷</span>
                        }
                        {!product.inStock && <div className="product-card__oos">Out of Stock</div>}
                      </div>
                      <div className="product-card__body">
                        <h4>{product.name}</h4>
                        {product.description && (
                          <p className="product-card__desc">{product.description.slice(0, 70)}...</p>
                        )}
                        <div className="product-card__pricing">
                          <span className="price">{formatPrice(product.price)}</span>
                          {product.comparePrice && <span className="price-compare">{formatPrice(product.comparePrice)}</span>}
                        </div>
                        <div className="product-card__actions">
                          <button className="btn btn--ghost btn--sm" onClick={() => handleToggleVisibility(product)}>
                            {product.isVisible ? '👁' : '🙈'}
                          </button>
                          <button className="btn btn--outline btn--sm" onClick={() => { setEditProduct(product); setShowModal(true); }}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(product._id)}>
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && <ErrorBoundary><OrdersTab /></ErrorBoundary>}
          {activeTab === 'analytics' && <ErrorBoundary><AnalyticsChart /></ErrorBoundary>}
          {activeTab === 'discounts' && <ErrorBoundary><DiscountsTab /></ErrorBoundary>}
          {activeTab === 'reviews' && <ErrorBoundary><ReviewsTab /></ErrorBoundary>}
          {activeTab === 'store' && <ErrorBoundary><StoreProfileTab vendor={vendor} updateVendor={updateVendor} /></ErrorBoundary>}
          {activeTab === 'tools' && <ErrorBoundary><ToolsTab /></ErrorBoundary>}
          {activeTab === 'subscription' && <ErrorBoundary><SubscriptionTab subscription={vendor?.subscription} vendorEmail={vendor?.email} /></ErrorBoundary>}
        </div>
      </main>

      {showModal && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSuccess={handleModalSuccess}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Delete Product?</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal__body">
              <p style={{ color: 'var(--gray-600)', marginBottom: 24 }}>This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Orders Tab ────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    API.get(`/orders${filter ? `?status=${filter}` : ''}`)
      .then(res => setOrders(res.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      const res = await API.patch(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id === id ? res.data : o));
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const statuses = ['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const statusColors = { pending: 'gold', confirmed: 'green', shipped: 'green', delivered: 'green', cancelled: 'red' };

  return (
    <div className="orders-tab fade-in">
      <div className="orders-toolbar">
        <div className="status-filters">
          {statuses.map(s => (
            <button key={s} className={`status-filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🧾</div>
          <h3>No orders yet</h3>
          <p>Orders will appear here when customers tap "Order on WhatsApp"</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order._id} className="order-card card">
              <div className="order-card__img">
                {order.productImage
                  ? <img src={`http://localhost:5000${order.productImage}`} alt="" />
                  : <span>📦</span>
                }
              </div>
              <div className="order-card__info">
                <h4>{order.productName}</h4>
                <p className="price">₦{Number(order.productPrice).toLocaleString('en-NG')}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="order-card__status">
                <span className={`badge badge--${statusColors[order.status] || 'gray'}`}>{order.status}</span>
                <select
                  value={order.status}
                  onChange={e => updateStatus(order._id, e.target.value)}
                  className="status-select"
                >
                  {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Store Profile Tab ─────────────────────────────────────────────────────
function StoreProfileTab({ vendor, updateVendor }) {
  const [form, setForm] = useState({
    storeName: vendor?.storeName || '',
    storeDescription: vendor?.storeDescription || '',
    storeCategory: vendor?.storeCategory || 'Others',
    location: vendor?.location || '',
    whatsappNumber: vendor?.whatsappNumber || ''
  });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const categories = ['Fashion', 'Food & Drinks', 'Electronics', 'Beauty', 'Home & Living', 'Agriculture', 'Services', 'Others'];

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('storeLogo', logoFile);
      const res = await API.put('/vendor/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateVendor(res.data);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div className="store-profile-tab fade-in">
      <form onSubmit={handleSubmit}>
        <div className="profile-grid">
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-deep)', marginBottom: 24 }}>Store Information</h3>
            <div className="form-group"><label>Store Name</label><input name="storeName" value={form.storeName} onChange={handleChange} /></div>
            <div className="form-group"><label>Description</label><textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} /></div>
            <div className="form-group">
              <label>Category</label>
              <select name="storeCategory" value={form.storeCategory} onChange={handleChange}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Location</label><input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lagos, Nigeria" /></div>
            <div className="form-group"><label>WhatsApp Number</label><input name="whatsappNumber" value={form.whatsappNumber} onChange={handleChange} /></div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-deep)', marginBottom: 24 }}>Store Logo</h3>
            <div className="logo-upload">
              <div className="logo-preview">
                {logoFile ? <img src={URL.createObjectURL(logoFile)} alt="" />
                  : vendor?.storeLogo ? <img src={`http://localhost:5000${vendor.storeLogo}`} alt="" />
                  : <span>{vendor?.storeName?.[0]?.toUpperCase()}</span>}
              </div>
              <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                Upload Logo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Subscription Tab ───────────────────────────────────────────────────────
function SubscriptionTab({ subscription, vendorEmail }) {
  const [loading, setLoading] = useState(false);

  const plans = [
    { id: 'free', name: 'Free', price: '₦0', features: ['Up to 10 products', 'WhatsApp button', 'Basic support'], isFree: true },
    { id: 'starter', name: 'Starter', price: '₦2,500/mo', features: ['Up to 50 products', 'WhatsApp button', 'Priority support', 'Custom banner'] },
    { id: 'pro', name: 'Pro', price: '₦5,000/mo', features: ['Unlimited products', 'WhatsApp button', 'Priority support', 'Analytics', 'Custom domain'] }
  ];

  const daysLeft = subscription?.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt) - Date.now()) / 86400000))
    : 0;

  const handleUpgrade = async (planId) => {
    setLoading(planId);
    try {
      const res = await API.post('/payments/initialize', { plan: planId });
      window.location.href = res.data.authorization_url;
    } catch (err) {
      toast.error('Failed to start payment. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="subscription-tab fade-in">
      <div className="sub-status-card card" style={{ padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: 4 }}>Current Plan</p>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-deep)', fontSize: '1.6rem' }}>
              {subscription?.plan?.toUpperCase() || 'FREE'} Plan
            </h2>
          </div>
          <span className={`badge ${subscription?.status === 'active' ? 'badge--green' : subscription?.status === 'trial' ? 'badge--gold' : 'badge--red'}`} style={{ padding: '6px 14px', fontSize: '0.9rem' }}>
            {subscription?.status === 'trial' ? `Trial: ${daysLeft}d left` : subscription?.status || 'Active'}
          </span>
        </div>
        {subscription?.expiresAt && (
          <p style={{ color: 'var(--gray-400)', fontSize: '0.82rem', marginTop: 12 }}>
            Expires: {new Date(subscription.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-deep)', marginBottom: 20 }}>Choose a Plan</h3>

      <div className="plans-grid">
        {plans.map(plan => {
          const isCurrent = subscription?.plan === plan.id || (plan.isFree && !subscription?.plan);
          return (
            <div key={plan.id} className={`plan-card card ${isCurrent ? 'plan-card--current' : ''}`}>
              {isCurrent && <div className="plan-card__badge">Your Plan</div>}
              <h3 style={{ fontFamily: 'var(--font-display)' }}>{plan.name}</h3>
              <div className="plan-card__price">{plan.price}</div>
              <ul className="plan-features">
                {plan.features.map(f => <li key={f}>✓ {f}</li>)}
              </ul>
              <button
                className={`btn ${isCurrent ? 'btn--ghost' : 'btn--primary'} btn--full`}
                disabled={isCurrent || loading === plan.id || plan.isFree}
                onClick={() => !isCurrent && !plan.isFree && handleUpgrade(plan.id)}
                style={{ marginTop: 24 }}
              >
                {loading === plan.id ? 'Redirecting...'
                  : isCurrent ? 'Current Plan'
                  : plan.isFree ? 'Free Forever'
                  : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
