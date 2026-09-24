import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const IMG_BASE = 'http://localhost:5000/api'.replace('/api','');

// ── QR Code card ────────────────────────────────────────────────────────────
function QRCodeCard({ storeSlug }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await API.get('/vendor/qrcode', { responseType: 'blob' });
      setQrUrl(URL.createObjectURL(res.data));
    } catch { toast.error('Failed to generate QR code'); }
    finally { setLoading(false); }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `${storeSlug}-qr.png`;
    a.click();
  };

  return (
    <div className="tool-card card">
      <div className="tool-card__icon">📱</div>
      <h4>Store QR Code</h4>
      <p>Print this QR code in your shop, on packaging, or flyers. Customers scan to visit your store.</p>
      {!qrUrl ? (
        <button className="btn btn--primary btn--sm" onClick={generate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
      ) : (
        <div className="qr-result">
          <img src={qrUrl} alt="QR Code" className="qr-img" />
          <button className="btn btn--outline btn--sm" onClick={download}>⬇ Download PNG</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setQrUrl(null)}>Regenerate</button>
        </div>
      )}
    </div>
  );
}

// ── Referral card ───────────────────────────────────────────────────────────
function ReferralCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/vendor/referral').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(data.referralUrl);
    toast.success('Referral link copied!');
  };

  if (loading) return <div className="tool-card card"><div className="spinner" style={{margin:'20px auto'}} /></div>;

  return (
    <div className="tool-card card">
      <div className="tool-card__icon">🎁</div>
      <h4>Referral Program</h4>
      <p>Share your referral link. For every vendor who signs up using it, you earn 1 free month.</p>
      <div className="referral-stats">
        <div><span>Referrals</span><strong>{data?.referralCount || 0}</strong></div>
        <div><span>Your Code</span><strong>{data?.referralCode || '—'}</strong></div>
      </div>
      {data?.referralUrl && (
        <div className="referral-link">
          <code>{data.referralUrl}</code>
          <button className="btn btn--primary btn--sm" onClick={copy}>Copy Link</button>
        </div>
      )}
    </div>
  );
}

// ── CSV Export card ─────────────────────────────────────────────────────────
function CSVExportCard() {
  const download = async () => {
    try {
      const res = await API.get('/products/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vendora-products.csv';
      a.click();
      toast.success('Products exported!');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="tool-card card">
      <div className="tool-card__icon">📊</div>
      <h4>Export Products (CSV)</h4>
      <p>Download all your products as a CSV spreadsheet for backup or editing in Excel.</p>
      <button className="btn btn--outline btn--sm" onClick={download}>⬇ Download CSV</button>
    </div>
  );
}

// ── Custom Domain card ──────────────────────────────────────────────────────
function CustomDomainCard({ vendor }) {
  const { updateVendor } = useAuth();
  const [domain, setDomain] = useState(vendor?.customDomain || '');
  const [saving, setSaving] = useState(false);
  const isPro = vendor?.subscription?.plan === 'pro';

  const handleSave = async () => {
    if (!domain.trim()) return toast.error('Enter a domain');
    setSaving(true);
    try {
      const res = await API.put('/vendor/custom-domain', { customDomain: domain.trim().toLowerCase() });
      updateVendor(res.data.vendor);
      toast.success('Custom domain saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className={`tool-card card ${!isPro ? 'tool-card--locked' : ''}`}>
      <div className="tool-card__icon">🌐</div>
      <h4>Custom Domain {!isPro && <span className="pro-badge">PRO</span>}</h4>
      <p>Use your own domain (e.g. <code>adunola.com</code>) instead of the default Vendora link.</p>
      {isPro ? (
        <>
          <div className="form-group" style={{marginBottom:12}}>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="e.g. adunola.com"
              style={{marginTop:4}}
            />
          </div>
          {vendor?.customDomain && (
            <div style={{marginBottom:12,fontSize:'0.82rem',color:'var(--gray-600)'}}>
              Point a <code>CNAME</code> from <strong>{vendor.customDomain}</strong> to <code>stores.vendora.ng</code>
              {vendor.customDomainVerified
                ? <span className="badge badge--green" style={{marginLeft:8}}>Verified ✓</span>
                : <span className="badge badge--gold" style={{marginLeft:8}}>Pending DNS</span>
              }
            </div>
          )}
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Domain'}
          </button>
        </>
      ) : (
        <div className="locked-overlay">
          <span>Upgrade to Pro to use a custom domain</span>
        </div>
      )}
    </div>
  );
}

// ── Store Theme card ────────────────────────────────────────────────────────
function StoreThemeCard({ vendor }) {
  const { updateVendor } = useAuth();
  const [theme, setTheme] = useState(vendor?.storeTheme || 'default');
  const [saving, setSaving] = useState(false);

  const themes = [
    { id: 'default',    label: 'Forest Green', colors: ['#0f3d2e','#f5a623','#faf8f3'] },
    { id: 'midnight',   label: 'Midnight',     colors: ['#1a1a3e','#a78bfa','#0d0d1a'] },
    { id: 'terracotta', label: 'Terracotta',   colors: ['#8b4513','#f5a623','#fdf7f3'] },
    { id: 'ocean',      label: 'Ocean',        colors: ['#0369a1','#06b6d4','#f0f9ff'] },
    { id: 'forest',     label: 'Deep Forest',  colors: ['#14532d','#bbf7d0','#f0fdf4'] },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('storeTheme', theme);
      const res = await API.put('/vendor/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateVendor(res.data);
      toast.success('Theme saved!');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="tool-card card tool-card--wide">
      <div className="tool-card__icon">🎨</div>
      <h4>Store Theme</h4>
      <p>Choose a colour scheme for your public store page.</p>
      <div className="theme-picker">
        {themes.map(t => (
          <button
            key={t.id}
            className={`theme-option ${theme === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
            title={t.label}
          >
            <div className="theme-preview">
              {t.colors.map((c,i) => <div key={i} style={{background:c, flex:1, height:'100%'}} />)}
            </div>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <button className="btn btn--primary btn--sm" style={{marginTop:16}} onClick={handleSave} disabled={saving || theme === vendor?.storeTheme}>
        {saving ? 'Saving...' : 'Apply Theme'}
      </button>
    </div>
  );
}

// ── Main Tools Tab ─────────────────────────────────────────────────────────
export default function ToolsTab() {
  const { vendor } = useAuth();
  return (
    <div className="tools-tab fade-in">
      <div className="tab-toolbar">
        <div>
          <h3 className="tab-title">Tools & Integrations</h3>
          <p className="tab-sub">Grow and manage your store</p>
        </div>
      </div>
      <div className="tools-grid">
        <QRCodeCard storeSlug={vendor?.storeSlug} />
        <ReferralCard />
        <CSVExportCard />
        <CustomDomainCard vendor={vendor} />
        <StoreThemeCard vendor={vendor} />
      </div>
    </div>
  );
}
