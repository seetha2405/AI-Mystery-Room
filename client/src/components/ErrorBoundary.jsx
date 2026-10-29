import { Component } from 'react';
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="center-state">
        <p className="eyebrow">Something went wrong</p>
        <h1>We lost the thread.</h1>
        <p>Reload the page to continue your investigation.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
