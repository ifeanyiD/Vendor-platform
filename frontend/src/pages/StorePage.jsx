import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { axiosInstanceStore, BASE_URL } from '../config/api';
import Lightbox from '../components/Lightbox/Lightbox';
import {domain} from "../../../shared/data/domain";
import SEOHead from '../services/helmet';
import './StorePage.scss';

const API_BASE =  BASE_URL;
const IMG_BASE = API_BASE.replace('/api', '');


const formatPrice = (n) => '₦' + Number(n).toLocaleString('en-NG');

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const buildWhatsAppUrl = (vendor, product) => {
  const phone = vendor.whatsappNumber.replace(/\D/g, '');
  const normalizedPhone = phone.startsWith('0') ? `234${phone.slice(1)}` : phone;
  const msg = `Hello! I'd like to order:

  *${product.name}*
  Price: ${formatPrice(product.price)}

  From your store: ${vendor.storeName}

  Is this item available?`;
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`;
  };



// ── Social Share ──────────────────────────────────────────────────────────
const ShareButton = ({ vendor }) => {
  const [open, setOpen] = useState(false);
  const storeUrl = window.location.href;
  const text = `Shop at ${vendor.storeName} on ${domain}!`;

  const shareOptions = [
    {
      label: 'WhatsApp',
      color: '#25D366',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(`${text} ${storeUrl}`)}`
    },
    {
      label: 'Twitter / X',
      color: '#1DA1F2',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(storeUrl)}`
    },
    {
      label: 'Facebook',
      color: '#1877F2',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`
    },
    {
      label: 'Copy Link',
      color: 'var(--green-deep)',
      icon: '🔗',
      copy: storeUrl
    }
  ];

  const handleShare = (option) => {
    if (option.copy) {
      navigator.clipboard.writeText(option.copy);
      // tiny toast via a simple state
      setOpen(false);
      return;
    }
    window.open(option.url, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  // Native share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: vendor.storeName, text, url: storeUrl });
        return;
      } catch {}
    }
    setOpen(o => !o);
  };

  return (
    <div className="share-wrap">
      <button className="share-btn" onClick={handleNativeShare} aria-label="Share store">
        🔗 Share Store
      </button>
      {open && (
        <>
          <div className="share-overlay" onClick={() => setOpen(false)} />
          <div className="share-dropdown">
            {shareOptions.map(opt => (
              <button
                key={opt.label}
                className="share-option"
                onClick={() => handleShare(opt)}
                style={{ '--share-color': opt.color }}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};


export default function StorePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    axiosInstanceStore.getStore(slug, searchQuery)
      .then(res => {
        setData(res.data);
      })
      .catch(err => setError(err.response?.data?.message || 'Store not found'))
      .finally(() => setLoading(false));
  }, [slug, searchQuery]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);


  if (loading) return (
    <div className="page-loader"><div className="spinner" /></div>
  );

  if (error) return (
    <div className="store-error">
      <div className="store-error__inner">
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏪</div>
        <h2>Store not found</h2>
        <p>This store doesn't exist or has been removed.</p>
        <Link to="/" className="btn btn--primary">Go to {domain}</Link>
      </div>
    </div>
  );
 
  const { vendor, products } = data;
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const waPhone = vendor.whatsappNumber.replace(/\D/g, '').replace(/^0/, '234');

 return (
    <div className="store-page fade-in">
      <SEOHead vendor={vendor} products={products} />
  
      {/* BANNER */}
      <div className="store-banner">
        {vendor.storeBanner
          ? <img src={`${IMG_BASE}${vendor.storeBanner}`} alt="" />
          : <div className="store-banner__default" />
        }
      </div>

      {/* STORE HEADER */}
      <div className="store-header">
        <div className="container">
          <div className="store-header__inner">
            <div className="store-avatar">
              {vendor.storeLogo
                ? <img src={`${IMG_BASE}${vendor.storeLogo}`} alt={vendor.storeName} />
                : <span>{vendor.storeName?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="store-meta">
              <div className="store-meta__top">
                <h1>{vendor.storeName}</h1>
                {vendor.storeCategory && (
                  <span className="badge badge--green">{vendor.storeCategory}</span>
                )}
              </div>
              {vendor.storeDescription && (
                <p className="store-meta__desc">{vendor.storeDescription}</p>
              )}
              {vendor.location && (
                <p className="store-meta__location">📍 {vendor.location}</p>
              )}
            </div>
            <div className="store-header__ctas">
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer"
                className="store-wa-contact"
              >
                <WhatsAppIcon />
                Chat with Vendor
              </a>
              <ShareButton vendor={vendor} />
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="store-products">
        <div className="container">
          {/* Search */}
          <div className="store-search-bar">
            <input
              type="text"
              placeholder="🔍  Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="store-search-input"
            />
          </div>

          {/* Category filter */}
          {categories.length > 1 && !searchQuery && (
            <div className="category-filter">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="store-empty">
              <span>{search ? '🔍' : '📦'}</span>
              <p>{search ? `No products found for "${search}"` : 'No products available yet.'}</p>
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => (
                <ProductCard key={product._id} product={product} vendor={vendor} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="store-footer">
        <p>
          Powered by <Link to="/" className="store-footer__link">{domain}</Link> · Want your own store?{' '}
          <Link to="/register" className="store-footer__link">Create one free →</Link>
        </p>
      </footer>
    </div>
  );
}

function ProductCard({ product, vendor }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasImages = product.images?.length > 0;

  const handlePrev = useCallback(() => {
    setImgIdx(i => (i - 1 + product.images.length) % product.images.length);
  }, [product.images]);

  const handleNext = useCallback(() => {
    setImgIdx(i => (i + 1) % product.images.length);
  }, [product.images]);

  const resolveImg = (src) =>
    src?.startsWith('/') ? `${IMG_BASE}${src}` : src;

    return ( 
    <>
      <div className="product-card">
        <div
          className="product-card__img"
          onClick={() => hasImages && setLightboxOpen(true)}
          style={{ cursor: hasImages ? 'zoom-in' : 'default' }}
        >
          {hasImages ? (
            <>
              <img src={resolveImg(product.images[imgIdx])} alt={product.name} />
              {product.images.length > 1 && (
                <div className="product-card__img-dots">
                  {product.images.map((_, i) => (
                    <button
                      key={i}
                      className={`dot ${i === imgIdx ? 'active' : ''}`}
                      onMouseEnter={() => setImgIdx(i)}
                      onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                    />
                  ))}
                </div>
              )}
              <div className="product-card__zoom-hint">🔍</div>
            </>
          ) : (
            <div className="product-card__img-placeholder">🛍️</div>
          )}
          {!product.inStock && <div className="oos-badge">Out of Stock</div>}
          {product.comparePrice && product.comparePrice > product.price && (
            <div className="sale-badge">
              -{Math.round((1 - product.price / product.comparePrice) * 100)}%
            </div>
          )}
        </div>

        <div className="product-card__body">
          <h3 className="product-card__name">{product.name}</h3>
          {product.category && product.category !== 'General' && (
            <span className="product-card__cat">{product.category}</span>
          )}
          {product.description && (
            <p className="product-card__desc">
              {product.description.slice(0, 100)}{product.description.length > 100 ? '...' : ''}
            </p>
          )}
          <div className="product-card__pricing">
            <span className="price">{formatPrice(product.price)}</span>
            {product.comparePrice && (
              <span className="price-compare">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
          <a
            href={buildWhatsAppUrl(vendor, product)}
            target="_blank"
            rel="noreferrer"
            className={`whatsapp-btn ${!product.inStock ? 'whatsapp-btn--disabled' : ''}`}
            onClick={e => !product.inStock && e.preventDefault()}
          >
            <WhatsAppIcon />
            {product.inStock ? 'Order on WhatsApp' : 'Currently Unavailable'}
          </a>
        </div>
      </div>

      {lightboxOpen && hasImages && (
        <Lightbox
          images={product.images}
          currentIndex={imgIdx}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
