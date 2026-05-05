import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  formatBrowserSessionDiagnostics,
  getBrowserSessionDiagnostics,
  recordBrowserSessionDiagnostic,
} from '../services/browserSessionDiagnostics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  diagnosticsCopied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, diagnosticsCopied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, diagnosticsCopied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    recordBrowserSessionDiagnostic({
      area: 'route',
      event: 'route_render_failed',
      severity: 'error',
      message: error.message || 'Route render failed.',
      details: {
        name: error.name,
        componentStack: errorInfo.componentStack,
      },
    });
    this.setState({ diagnosticsCopied: false });
  }

  private copyDiagnostics = async () => {
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(formatBrowserSessionDiagnostics());
    this.setState({ diagnosticsCopied: true });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="m-5 rounded-lg border-2 border-app-accent bg-app-accent-soft p-5"
          role="alert"
        >
          <h1 className="mb-2 text-2xl font-semibold text-app-accent">Something went wrong</h1>
          <p className="mb-3 mt-0 text-app-text-muted">
            Try again to recover without reloading. If the problem persists, contact support.
          </p>
          <button
            type="button"
            onClick={() =>
              this.setState({ hasError: false, error: null, diagnosticsCopied: false })
            }
            className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
          >
            Try again
          </button>
          {getBrowserSessionDiagnostics().length > 0 ? (
            <details className="mt-3 text-sm text-app-text-muted">
              <summary>Session diagnostics</summary>
              <div className="mt-2 space-y-2">
                <p>
                  {getBrowserSessionDiagnostics().length} browser-session event
                  {getBrowserSessionDiagnostics().length === 1 ? '' : 's'} captured for support.
                </p>
                <button
                  type="button"
                  onClick={() => void this.copyDiagnostics()}
                  className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-xs font-semibold text-app-text transition-colors hover:bg-app-hover"
                >
                  Copy diagnostics
                </button>
                {this.state.diagnosticsCopied ? (
                  <span className="ml-2 text-xs text-app-text-muted">Copied.</span>
                ) : null}
              </div>
            </details>
          ) : null}
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
