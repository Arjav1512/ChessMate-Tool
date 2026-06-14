import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--cm-bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--cm-bg-surface)',
            border: '1px solid var(--cm-border-default)',
            borderRadius: '14px',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'var(--cm-error-dim)',
              border: '1px solid rgba(232,85,74,0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: 'var(--cm-error)' }} />
            </div>

            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--cm-text-primary)',
              marginBottom: '8px',
              letterSpacing: '-0.2px',
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: '13px',
              color: 'var(--cm-text-secondary)',
              marginBottom: '20px',
              lineHeight: 1.6,
            }}>
              We encountered an unexpected error. This has been logged and we'll look into it.
            </p>

            {this.state.error && (
              <details style={{ marginBottom: '20px', textAlign: 'left' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--cm-text-muted)',
                  marginBottom: '6px',
                }}>
                  Error details
                </summary>
                <pre style={{
                  fontSize: '11px',
                  color: 'var(--cm-error)',
                  background: 'var(--cm-bg-base)',
                  border: '1px solid var(--cm-border-subtle)',
                  padding: '10px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  maxHeight: '160px',
                  fontFamily: 'var(--font-family-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'var(--cm-accent)',
                  border: '1px solid transparent',
                  borderRadius: '7px',
                  color: 'var(--cm-text-inverse)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} />
                Try Again
              </button>

              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--cm-bg-elevated)',
                  border: '1px solid var(--cm-border-default)',
                  borderRadius: '7px',
                  color: 'var(--cm-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Go Home
              </button>
            </div>

            <p style={{
              fontSize: '11px',
              color: 'var(--cm-text-muted)',
              marginTop: '20px',
            }}>
              If this persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

