import React from 'react';
import './Skeleton.scss';

// ── Base skeleton shimmer ────────────────────────────────────────────────────
export function Skeleton({ width, height, radius, style }) {
  return (
    <div
      className="skeleton"
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: radius || '6px',
        ...style
      }}
    />
  );
}

// ── Product card skeleton ────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card">
      <Skeleton height="170px" radius="0" />
      <div style={{ padding: 14 }}>
        <Skeleton height="14px" width="80%" style={{ marginBottom: 8 }} />
        <Skeleton height="11px" width="60%" style={{ marginBottom: 12 }} />
        <Skeleton height="18px" width="45%" style={{ marginBottom: 14 }} />
        <Skeleton height="38px" radius="20px" />
      </div>
    </div>
  );
}

// ── Products grid skeleton ────────────────────────────────────────────────────
export function ProductsGridSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Store header skeleton ─────────────────────────────────────────────────────
export function StoreHeaderSkeleton() {
  return (
    <div className="skeleton-store-header">
      <Skeleton height="200px" radius="0" style={{ marginBottom: 0 }} />
      <div style={{ padding: '0 24px 24px', background: 'var(--white)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingTop: 0 }}>
          <Skeleton width="80px" height="80px" radius="50%" style={{ marginTop: -40, flexShrink: 0 }} />
          <div style={{ flex: 1, paddingTop: 12 }}>
            <Skeleton height="24px" width="200px" style={{ marginBottom: 8 }} />
            <Skeleton height="13px" width="300px" style={{ marginBottom: 6 }} />
            <Skeleton height="11px" width="120px" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard stat skeleton ────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="skeleton-stat-card">
      <Skeleton height="12px" width="70%" style={{ marginBottom: 8 }} />
      <Skeleton height="28px" width="50%" style={{ marginBottom: 6 }} />
      <Skeleton height="10px" width="40%" />
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="skeleton-table-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton height="14px" width={i === 0 ? '80%' : '60%'} /></td>
      ))}
    </tr>
  );
}
