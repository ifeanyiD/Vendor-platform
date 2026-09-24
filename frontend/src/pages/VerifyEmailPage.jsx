import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { API } from '../config/api';
import './AuthPages.scss';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token    = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus]   = useState('loading'); // loading | success | error | already
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    API.get(`/auth/verify-email?token=${token}`)
      .then(res => {
        if (res.data.message?.toLowerCase().includes('already')) {
          setStatus('already');
        } else {
          setStatus('success');
        }
        setMessage(res.data.message);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. Please try again.');
      });
  }, [token]);

  const icons = {
    loading: <div className="spinner" style={{ width: 40, height: 40 }} />,
    success: <div style={{ fontSize: '3rem' }}>✅</div>,
    already: <div style={{ fontSize: '3rem' }}>✅</div>,
    error:   <div style={{ fontSize: '3rem' }}>❌</div>
  };

  const titles = {
    loading: 'Verifying your email…',
    success: 'Email verified!',
    already: 'Already verified',
    error:   'Verification failed'
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <Link to="/" className="brand">
            <span className="brand__icon">V</span>
            <span className="brand__name">Vendora</span>
          </Link>
          <div className="auth-brand__content">
            <h2>Verify your email</h2>
            <p>One click to activate your store and start selling.</p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner" style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ marginBottom: 20 }}>{icons[status]}</div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 12 }}>{titles[status]}</h1>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 28 }}>
              {status === 'loading' ? 'Confirming your email address…' : message}
            </p>

            {status === 'success' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: 20 }}>
                Redirecting to login in a moment…
              </p>
            )}

            {(status === 'success' || status === 'already') && (
              <Link to="/login" className="btn btn--primary">Go to Login →</Link>
            )}

            {status === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <ResendVerification />
                <Link to="/login" className="btn btn--ghost btn--sm">Back to Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResendVerification() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await API.post('/auth/resend-verification', { email });
      setSent(true);
    } catch {}
    finally { setLoading(false); }
  };

  if (sent) return (
    <p style={{ color: 'var(--green-mid)', fontSize: '0.9rem' }}>
      ✅ A new verification link has been sent to your email.
    </p>
  );

  if (!show) return (
    <button className="btn btn--outline btn--sm" onClick={() => setShow(true)}>
      Resend verification email
    </button>
  );

  return (
    <form onSubmit={handleResend} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{ padding: '10px 14px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', outline: 'none' }}
        required
      />
      <button type="submit" className="btn btn--primary btn--sm" disabled={loading}>
        {loading ? 'Sending…' : 'Send Link'}
      </button>
    </form>
  );
}
