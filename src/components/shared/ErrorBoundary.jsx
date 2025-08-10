import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);
    
    // Don't show error boundary for certain types of errors that should be handled gracefully
    const errorMessage = error.message || '';
    const isNetworkError = errorMessage.includes('fetch') || 
                          errorMessage.includes('network') || 
                          errorMessage.includes('Failed to delete user');
    
    if (isNetworkError) {
      console.warn('Network/API error caught by ErrorBoundary, but should be handled by component');
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Check if this is a user deletion error that should be handled gracefully
      const errorMessage = this.state.error?.message || '';
      const isDeletionError = errorMessage.includes('delete') || 
                             errorMessage.includes('user') ||
                             errorMessage.includes('admin');
      
      if (isDeletionError) {
        console.warn('Deletion error caught by ErrorBoundary - this should be handled by the component');
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
            <p className="text-base text-muted-foreground mb-8">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {isDeletionError && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This appears to be related to a user management operation. 
                  The operation may have completed successfully despite this error.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="btn-primary w-full"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto text-foreground">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
