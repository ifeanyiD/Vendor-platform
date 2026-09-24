import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API } from '../../config/api';

const Stars = ({ rating }) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

export default function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    API.get('/reviews').then(r => setReviews(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id, isApproved) => {
    try {
      const res = await API.patch(`/reviews/${id}/approve`, { isApproved });
      setReviews(p => p.map(r => r._id === id ? res.data : r));
      toast.success(isApproved ? 'Review approved!' : 'Review hidden');
    } catch { toast.error('Failed'); }
  };

  const visible = reviews.filter(r =>
    filter === 'all' ? true : filter === 'approved' ? r.isApproved : !r.isApproved
  );

  const avg = reviews.filter(r => r.isApproved).length
    ? (reviews.filter(r=>r.isApproved).reduce((s,r) => s+r.rating, 0) / reviews.filter(r=>r.isApproved).length).toFixed(1)
    : null;

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="reviews-tab fade-in">
      <div className="tab-toolbar">
        <div>
          <h3 className="tab-title">Customer Reviews</h3>
          <p className="tab-sub">{avg ? `Average: ${avg} ★` : 'No approved reviews yet'} · {reviews.filter(r=>r.isApproved).length} visible on store</p>
        </div>
      </div>

      <div className="filter-pills" style={{marginBottom:20}}>
        {['all','approved','pending'].map(f => (
          <button key={f} className={`category-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)} {f === 'all' ? `(${reviews.length})` : f === 'approved' ? `(${reviews.filter(r=>r.isApproved).length})` : `(${reviews.filter(r=>!r.isApproved).length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">⭐</div>
          <h3>No reviews here</h3>
          <p>Reviews submitted by customers will appear here for moderation</p>
        </div>
      ) : (
        <div className="reviews-list">
          {visible.map(r => (
            <div key={r._id} className={`review-card card ${!r.isApproved ? 'review-card--pending' : ''}`}>
              <div className="review-card__header">
                <div>
                  <strong>{r.customerName}</strong>
                  {r.product && <span className="review-product-badge">re: {r.product.name}</span>}
                </div>
                <div className="review-stars">{Stars(r.rating)}</div>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
              <div className="review-card__footer">
                <small>{new Date(r.createdAt).toLocaleDateString('en-NG')}</small>
                <div style={{display:'flex',gap:8}}>
                  {!r.isApproved
                    ? <button className="btn btn--primary btn--sm" onClick={() => handleApprove(r._id, true)}>✓ Approve</button>
                    : <button className="btn btn--ghost btn--sm" onClick={() => handleApprove(r._id, false)}>Hide</button>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
