import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './AuthPages.scss';
import {logo, domain} from "../../../shared/data/domain"

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    storeName: '',
    whatsappNumber: ''
  });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // ── Post-register: check email screen ────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="auth-page">
        <div className="auth-split">
          <div className="auth-brand">
            <Link to="/" className="brand">
              <span className="brand__icon">{logo}</span>
              <span className="brand__name">{domain}</span>
            </Link>
            <div className="auth-brand__content">
              <h2>Almost there!</h2>
              <p>Just one step left to open your store.</p>
            </div>
          </div>
          <div className="auth-form-panel">
            <div className="auth-form-inner" style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>📧</div>
              <h1 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Check your email</h1>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 8 }}>
                We sent a verification link to <strong>{registeredEmail}</strong>.
              </p>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28 }}>
                Click the link in your email to activate your account. Your store will be live once verified. Check your spam folder if you don't see it.
              </p>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>
                Already verified? <Link to="/login" style={{ color: 'var(--green-light)', fontWeight: 600 }}>Log in →</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.storeName || !form.whatsappNumber) {
      return toast.error('Please fill all fields');
    }
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const data = await register(form);
      setRegisteredEmail(data.email || form.email)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
            <h2>Open your store in minutes</h2>
            <p>Join thousands of Nigerian vendors selling smarter with WhatsApp.</p>
            <ul className="auth-perks">
              <li>✅ Free 30-day trial</li>
              <li>✅ Your own store link</li>
              <li>✅ WhatsApp order buttons</li>
              <li>✅ No tech skills needed</li>
            </ul>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <h1>Create your store</h1>
            <p className="auth-subtitle">Fill in your details to get started</p>
            {referralCode && (
              <div style={{ background: 'var(--green-pale)', border: '1px solid #b5dfc4', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20, fontSize: '0.88rem', color: 'var(--green-mid)', display: 'flex', gap: 8 }}>
                🎁 You were referred! Sign up to get started.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Store Name *</label>
                <input
                  name="storeName"
                  value={form.storeName}
                  onChange={handleChange}
                  placeholder="e.g. Adunola's Fashion House"
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number *</label>
                <input
                  name="whatsappNumber"
                  value={form.whatsappNumber}
                  onChange={handleChange}
                  placeholder="+234 803 000 0000"
                />
                <span className="form-hint">This is where customers will send orders</span>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={loading}
              >
                {loading ? 'Creating your store...' : 'Create My Free Store →'}
              </button>
            </form>

            <p className="auth-switch">
              Already have a store? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
