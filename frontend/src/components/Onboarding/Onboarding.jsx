import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Onboarding.scss';

const STEPS = [
  {
    id: 'welcome',
    icon: '🎉',
    title: 'Welcome to Vendora!',
    desc: 'Your store is live. Let\'s get you set up in 3 quick steps so you can start receiving orders on WhatsApp.',
    cta: 'Let\'s Go →'
  },
  {
    id: 'profile',
    icon: '🏪',
    title: 'Complete your store profile',
    desc: 'Add a store logo, description, and your city to build trust with customers. Stores with photos get 3× more orders.',
    cta: 'Got it →',
    action: 'store'
  },
  {
    id: 'products',
    icon: '📦',
    title: 'Add your first products',
    desc: 'Go to the Products tab and click "Add Product". Upload clear photos, set a price, and you\'re done!',
    cta: 'Add Products →',
    action: 'products'
  },
  {
    id: 'share',
    icon: '🔗',
    title: 'Share your store link!',
    desc: 'Copy your store link from the top of the dashboard and share it on WhatsApp, Instagram, and anywhere else.',
    cta: 'Start Selling! 🚀',
    action: 'done'
  }
];

const STORAGE_KEY = 'vendora_onboarding_done';

export default function Onboarding({ onNavigate }) {
  const { vendor } = useAuth();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  // Only show for vendors registered < 7 days ago
  const isNew = vendor?.createdAt
    ? new Date() - new Date(vendor.createdAt) < 7 * 24 * 60 * 60 * 1000
    : true;

  if (dismissed || !isNew) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleCta = () => {
    if (isLast || current.action === 'done') {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
      return;
    }
    if (current.action && onNavigate) {
      onNavigate(current.action);
    }
    setStep(s => s + 1);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="onboarding">
      <button className="onboarding__dismiss" onClick={handleDismiss} aria-label="Dismiss">✕</button>

      <div className="onboarding__steps">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`onboarding__step-dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}
          />
        ))}
      </div>

      <div className="onboarding__content">
        <div className="onboarding__icon">{current.icon}</div>
        <h3>{current.title}</h3>
        <p>{current.desc}</p>
      </div>

      <div className="onboarding__footer">
        {step > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
        <button className="btn btn--primary btn--sm" onClick={handleCta}>
          {current.cta}
        </button>
      </div>
    </div>
  );
}
