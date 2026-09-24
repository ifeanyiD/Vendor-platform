import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './AuthPages.scss';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please enter email and password');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
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
            <h2>Welcome back, Vendor!</h2>
            <p>Log in to manage your store, products, and orders.</p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <h1>Log into your store</h1>
            <p className="auth-subtitle">Enter your credentials to continue</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In →'}
              </button>
            </form>
            <p className="auth-switch" style={{ marginBottom: 8 }}>
              <Link to="/forgot-password" style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                Forgot your password?
              </Link>
            </p>
            <p className="auth-switch">
              New to Storely-NG? <Link to="/register">Create a free store</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
