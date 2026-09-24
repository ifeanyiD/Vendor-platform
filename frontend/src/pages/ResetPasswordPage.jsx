import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
// import { API } from '../context/AuthContext';
import './AuthPages.scss';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || !form.confirm) return toast.error('Please fill both fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (!token) return toast.error('Invalid reset link');

    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2>Invalid reset link</h2>
          <p>This link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn btn--primary">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <Link to="/" className="brand">
            <span className="brand__icon">V</span>
            <span className="brand__name">Vendora</span>
          </Link>
          <div className="auth-brand__content">
            <h2>Set a new password</h2>
            <p>Choose a strong password you'll remember.</p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <h1>New password</h1>
            <p className="auth-subtitle">Enter and confirm your new password</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat your password"
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password →'}
              </button>
            </form>

            <p className="auth-switch">
              <Link to="/login">← Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
