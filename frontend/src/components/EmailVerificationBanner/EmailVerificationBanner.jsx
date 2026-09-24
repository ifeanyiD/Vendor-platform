import React, { useState } from 'react';
import { API } from '../../config/api';
import './EmailVerificationBanner.scss';

export default function EmailVerificationBanner({ email }) {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const handleResend = async () => {
    setStatus('sending');
    try {
      await API.post('/auth/resend-verification', { email });
      setStatus('sent');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setStatus(msg.toLowerCase().includes('wait') ? 'rate-limited' : 'error');
    }
  };

  return (
    <div className="verify-banner">
      <div className="verify-banner__left">
        <span className="verify-banner__icon">📧</span>
        <div>
          <strong>Verify your email address</strong>
          <p>
            We sent a link to <strong>{email}</strong>. Click it to unlock your full account.
            Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
      <div className="verify-banner__right">
        {status === 'idle' && (
          <button className="btn btn--outline btn--sm" onClick={handleResend}>
            Resend Email
          </button>
        )}
        {status === 'sending' && (
          <button className="btn btn--ghost btn--sm" disabled>Sending…</button>
        )}
        {status === 'sent' && (
          <span className="verify-banner__success">✅ Link resent!</span>
        )}
        {status === 'rate-limited' && (
          <span className="verify-banner__warn">⏳ Please wait a moment</span>
        )}
        {status === 'error' && (
          <button className="btn btn--outline btn--sm" onClick={() => setStatus('idle')}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
