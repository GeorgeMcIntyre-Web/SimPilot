/**
 * SIMPILOT ERROR BOUNDARY
 *
 * Top-level error boundary that catches React rendering errors
 * and displays a user-friendly fallback UI.
 */

import React, { Component, type ReactNode } from 'react';
import { logError } from '../utils/logger';
import { log } from '../lib/log';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError(error, 'ErrorBoundary.componentDidCatch');

    // Log component stack for debugging
    if (errorInfo.componentStack) {
      log.error('Component stack', errorInfo.componentStack);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Default fallback UI
    return (
      <div className="error-boundary-fallback">
        <div className="error-boundary-content">
          <div className="error-boundary-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="error-boundary-title">Something went wrong</h1>

          <p className="error-boundary-message">
            An unexpected error occurred. Please try reloading the page.
          </p>

          {this.state.errorMessage && (
            <details className="error-boundary-details">
              <summary>Error details</summary>
              <pre>{this.state.errorMessage}</pre>
            </details>
          )}

          <button
            type="button"
            onClick={this.handleReload}
            className="error-boundary-button"
          >
            Reload Page
          </button>
        </div>

        <style>{`
          .error-boundary-fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            font-family: system-ui, -apple-system, sans-serif;
          }

          .error-boundary-content {
            max-width: 480px;
            text-align: center;
            padding: 3rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
          }

          .error-boundary-icon {
            color: #f87171;
            margin-bottom: 1.5rem;
          }

          .error-boundary-title {
            font-size: 1.75rem;
            font-weight: 600;
            margin: 0 0 0.75rem 0;
            color: #ffffff;
          }

          .error-boundary-message {
            font-size: 1rem;
            color: #a0aec0;
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
          }

          .error-boundary-details {
            text-align: left;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            font-size: 0.875rem;
          }

          .error-boundary-details summary {
            cursor: pointer;
            color: #90cdf4;
            margin-bottom: 0.5rem;
          }

          .error-boundary-details pre {
            margin: 0;
            padding: 0.75rem;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            color: #f87171;
            font-size: 0.75rem;
          }

          .error-boundary-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 2rem;
            font-size: 1rem;
            font-weight: 500;
            color: #ffffff;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .error-boundary-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }

          .error-boundary-button:active {
            transform: translateY(0);
          }
        `}</style>
      </div>
    );
  }
}

export default ErrorBoundary;
