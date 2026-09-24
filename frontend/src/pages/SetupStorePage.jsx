import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SetupStorePage() {
  const { vendor } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-deep)', marginBottom: '12px' }}>
          Welcome to Vendora, {vendor?.storeName}!
        </h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: '32px', lineHeight: '1.6' }}>
          Your store has been created. Now head to your dashboard to add products and start sharing your store link.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn btn--primary btn--lg">Go to Dashboard →</Link>
          <Link to={`/store/${vendor?.storeSlug}`} target="_blank" className="btn btn--outline">View My Store</Link>
        </div>
      </div>
    </div>
  );
}
