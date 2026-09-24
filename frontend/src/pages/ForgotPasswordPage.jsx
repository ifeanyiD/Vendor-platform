import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
// import { API } from '../context/AuthContext';
import './AuthPages.scss';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <Link to="/" className="brand">
            <span className="brand__icon">S</span>
            <span className="brand__name">Storely</span>
          </Link>
          <div className="auth-brand__content">
            <h2>Forgot your password?</h2>
            <p>No worries. Enter your email and we'll send you a reset link.</p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            {sent ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📧</div>
                <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Check your email</h1>
                <p style={{ color: 'var(--gray-600)', marginBottom: 28, lineHeight: 1.6 }}>
                  If <strong>{email}</strong> is registered, you'll receive a reset link shortly. Check your spam folder too.
                </p>
                <Link to="/login" className="btn btn--primary">← Back to Login</Link>
              </div>
            ) : (
              <>
                <h1>Reset password</h1>
                <p className="auth-subtitle">Enter your account email to receive a reset link</p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link →'}
                  </button>
                </form>

                <p className="auth-switch">
                  <Link to="/login">← Back to Login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
