import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload() {
    window.location.href = '/';
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center" style={{ minHeight: '100vh', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2>Something went wrong</h2>
          <p className="muted" style={{ maxWidth: 480, textAlign: 'center' }}>
            The page hit an unexpected error. Your data is safe — go back to the dashboard
            and try again.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={this.handleReload}>Back to dashboard</button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Try again</button>
          </div>
          {this.props.showDetails && (
            <pre className="muted" style={{ maxWidth: 640, overflow: 'auto', fontSize: 12 }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}