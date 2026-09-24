import React from 'react';
import { Link } from 'react-router-dom';
import {domain, logo} from "../../../shared/data/domain"
import './LandingPage.scss';

const features = [
  {
    icon: '🏪',
    title: 'Your Own Online Store',
    desc: 'Get a free store link like storely.ng/store/yourname. Share it everywhere.'
  },
  {
    icon: '💬',
    title: 'WhatsApp Orders',
    desc: 'Every product has a "Order on WhatsApp" button. Customers reach you instantly.'
  },
  {
    icon: '📦',
    title: 'Manage Products Easily',
    desc: 'Add, edit or remove products from your dashboard. No tech skills needed.'
  },
  {
    icon: '🇳🇬',
    title: 'Built for Nigeria',
    desc: 'Designed for how Nigerian businesses actually work — fast, simple, WhatsApp-first.'
  }
];

const categories = ['Fashion', 'Food & Drinks', 'Electronics', 'Beauty', 'Home & Living', 'Agriculture', 'Services'];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing__nav">
        <div className="container">
          <div className="nav-inner">
            <div className="brand">
              <span className="brand__icon">{logo}</span>
              <span className="brand__name">{domain}</span>
            </div>
            <div className="nav-links">
              <Link to="/login" className="btn btn--ghost btn--sm">Log in</Link>
              <Link to="/register" className="btn btn--primary btn--sm">Start Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing__hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-content fade-in">
              <div className="hero-badge">
                <span>🇳🇬</span> Built for Nigerian Vendors
              </div>
              <h1 className="hero-title">
                Sell Online.<br />
                Get Orders via<br />
                <span className="hero-title--accent">WhatsApp.</span>
              </h1>
              <p className="hero-desc">
                Create your free online store in minutes. Share your link, showcase your products, and receive orders directly on WhatsApp. No coding. No monthly fees to start.
              </p>
              <div className="hero-ctas">
                <Link to="/register" className="btn btn--gold btn--lg">
                  Create My Free Store →
                </Link>
                <Link to="/store/demo-store" className="btn btn--outline btn--lg">
                  See Example Store
                </Link>
              </div>
              <p className="hero-note">Free 30-day trial · No credit card required</p>
            </div>
            <div className="hero-visual fade-in">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="mock-store">
                    <div className="mock-banner" />
                    <div className="mock-store-info">
                      <div className="mock-avatar" />
                      <div className="mock-lines">
                        <div className="mock-line mock-line--title" />
                        <div className="mock-line mock-line--sub" />
                      </div>
                    </div>
                    <div className="mock-products">
                      {[1,2].map(i => (
                        <div className="mock-product" key={i}>
                          <div className="mock-product-img" />
                          <div className="mock-product-info">
                            <div className="mock-line" />
                            <div className="mock-line mock-line--price" />
                            <div className="mock-wa-btn">
                              <span>🟢</span> Order on WhatsApp
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-float hero-float--1">+₦15,000 order</div>
              <div className="hero-float hero-float--2">📲 New message!</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing__features">
        <div className="container">
          <div className="section-header">
            <h2>Everything you need to sell</h2>
            <p>Built around how Nigerian vendors operate</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="landing__categories">
        <div className="container">
          <div className="section-header">
            <h2>For every kind of vendor</h2>
          </div>
          <div className="categories-list">
            {categories.map(c => (
              <span key={c} className="category-pill">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing__how">
        <div className="container">
          <div className="section-header">
            <h2>Up and running in 3 steps</h2>
          </div>
          <div className="steps">
            {[
              { n: '01', t: 'Register your store', d: 'Sign up with your email, store name, and WhatsApp number.' },
              { n: '02', t: 'Add your products', d: 'Upload product photos, set prices, and write descriptions.' },
              { n: '03', t: 'Share your link', d: 'Share yourapp.com/store/yourname on WhatsApp, Instagram, anywhere.' }
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing__cta">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to open your online store?</h2>
            <p>Join thousands of Nigerian vendors already selling smarter.</p>
            <Link to="/register" className="btn btn--gold btn--lg">
              Create My Free Store →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing__footer">
        <div className="container">
          <div className="footer-inner">
            <div className="brand">
              <span className="brand__icon">{logo}</span>
              <span className="brand__name">{domain}</span>
            </div>
            <p>© 2025 {domain}. Made with ❤️ for Nigerian entrepreneurs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
