import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: this.props.fullPage ? '100vh' : '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          padding: '40px 24px',
          textAlign: 'center',
          background: 'var(--cream)'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-deep)', fontSize: '1.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--gray-600)', maxWidth: 400, lineHeight: 1.6 }}>
            {this.props.fallbackMessage ||
              'An unexpected error occurred. Please refresh the page and try again.'}
          </p>
          {this.props.showError && (
            <pre style={{
              background: 'var(--gray-100)',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: 'var(--red)',
              maxWidth: 500,
              overflow: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error?.message}
            </pre>
          )}
          <button
            className="btn btn--primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
              else window.location.reload();
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
