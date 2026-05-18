// Catches any uncaught render error in the component tree and shows a
// minimal recovery UI instead of a blank white screen.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] caught', error, info);
    }
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message || 'Unexpected error';
    return (
      <div className="min-h-[60vh] grid place-items-center px-6 py-12">
        <div className="card p-8 max-w-md text-center">
          <div className="text-accent-red font-mono text-xs uppercase tracking-wider mb-2">
            Application error
          </div>
          <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-white/60 text-sm mb-6 break-words">{msg}</p>
          <button onClick={this.handleReload} className="btn-primary w-full">
            Reload application
          </button>
        </div>
      </div>
    );
  }
}
