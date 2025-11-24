import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {this.props.fallbackTitle || 'Something went wrong'}
                </h2>
                
                <p className="text-slate-600 mb-4">
                  We encountered an unexpected error. Don't worry, your data is safe.
                  Try refreshing the page or contact support if the problem persists.
                </p>
                
                {this.state.error && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                    <p className="text-sm font-mono text-slate-700 break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-6">
                    <summary className="text-sm font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
