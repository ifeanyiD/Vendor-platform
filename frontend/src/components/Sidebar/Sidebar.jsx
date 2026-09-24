import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.scss';

const NAV_ITEMS = [
  { id: 'products',     icon: '📦', label: 'Products' },
  { id: 'orders',       icon: '🧾', label: 'Orders' },
  { id: 'analytics',   icon: '📊', label: 'Analytics' },
  { id: 'discounts',   icon: '🏷️', label: 'Discounts' },
  { id: 'reviews',     icon: '⭐', label: 'Reviews' },
  { id: 'store',       icon: '🏪', label: 'Store Profile' },
  { id: 'tools',       icon: '🔧', label: 'Tools' },
  { id: 'subscription',icon: '💳', label: 'Subscription' },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { vendor, logout } = useAuth();
  const navigate = useNavigate();

  // Close on ESC
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNav = (id) => { setActiveTab(id); onClose();};

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-logo">
            <span className="brand-logo__v">V</span>
            <span className="brand-logo__name">Vendora</span>
          </div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="sidebar__store">
          <div className="sidebar__avatar">
            {vendor?.storeLogo
              ? <img src={`http://localhost:5000${vendor.storeLogo}`} alt="" />
              : <span>{vendor?.storeName?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="sidebar__store-info">
            <strong>{vendor?.storeName}</strong>
            <span>@{vendor?.storeSlug}</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <Link
            to={`/store/${vendor?.storeSlug}`}
            target="_blank"
            className="sidebar__view-store"
            onClick={onClose}
          >
            <span>👁</span> View My Store
          </Link>
          <button onClick={handleLogout} className="sidebar__logout">
            <span>↩</span> Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
