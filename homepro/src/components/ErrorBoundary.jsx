import { Component } from 'react';

/**
 * Catches React render errors so the app shows a message instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f1f5f9', color: '#1e293b', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, maxWidth: 400 }}>
            The app hit an error. Try refreshing the page. If the backend is not running, start it from <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>homepro-server</code> with <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>node server.js</code>.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8,
              background: '#2563eb', color: '#fff', cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
