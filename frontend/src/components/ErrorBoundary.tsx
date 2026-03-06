import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="m-5 rounded-lg border-2 border-app-accent bg-app-accent-soft p-5"
          role="alert"
        >
          <h1 className="mb-2 text-2xl font-semibold text-app-accent">Something went wrong</h1>
          <p className="mb-3 mt-0 text-app-text-muted">
            Please refresh the page. If the problem persists, contact support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
          >
            Refresh
          </button>
          {import.meta.env.DEV && (
            <details className="mt-3 whitespace-pre-wrap text-sm text-app-text-muted">
              <summary>Error Details</summary>
              {this.state.error?.toString()}
              <br />
              {this.state.error?.stack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
