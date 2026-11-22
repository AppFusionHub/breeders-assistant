import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card stack-sm">
        <h2>Something went wrong on this screen</h2>
        <p className="small muted">Your data is safe. Go back and try again. If it keeps happening, export a backup in Settings.</p>
        <code className="small">{this.state.error.message}</code>
        <button className="btn" onClick={() => { this.setState({ error: null }); history.back(); }}>Go back</button>
      </div>
    );
  }
}
