import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { categorizeError, getUserFriendlyErrorMessage } from '@/utils/helpers';

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
    
    // Categorize the error for better handling
    const errorCategory = categorizeError(error);
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorCategory,
      userFriendlyMessage
    });
    
    // Log error to performance service
    if (window.performanceService) {
      window.performanceService.trackOperation(false);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRefreshPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { errorCategory, userFriendlyMessage } = this.state;
      const isNetworkError = errorCategory === 'network';
      const isAuthError = errorCategory === 'authentication';
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
            
            {/* Enhanced error message based on category */}
            <div className="mb-8">
              <p className="text-base text-muted-foreground mb-4">
                {userFriendlyMessage || 'We encountered an unexpected error.'}
              </p>
              
              {isNetworkError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Network Issue Detected:</strong> Your operation may have completed successfully. 
                    Try refreshing the page to see the current state.
                  </p>
                </div>
              )}
              
              {isAuthError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Authentication Issue:</strong> Please log out and log back in to continue.
                  </p>
                </div>
              )}
              
              {errorCategory === 'unknown' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    If you were performing an operation (like deleting a user), it may have completed successfully. 
                    Try refreshing to see the current state.
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Primary action based on error type */}
              {isNetworkError || errorCategory === 'unknown' ? (
                <button
                  onClick={this.handleRefreshPage}
                  className="btn-primary w-full"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Page
                </button>
              ) : (
                <button
                  onClick={this.handleRetry}
                  className="btn-primary w-full"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Try Again
                </button>
              )}
              
              {/* Secondary action */}
              <button
                onClick={isNetworkError ? this.handleRetry : this.handleRefreshPage}
                className="btn-secondary w-full"
              >
                {isNetworkError ? 'Try Again' : 'Refresh Page'}
              </button>
              
              {/* Authentication-specific action */}
              {isAuthError && (
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/login';
                  }}
                  className="btn-secondary w-full"
                >
                  Go to Login
                </button>
            )}
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto text-foreground">
                  Error Category: {errorCategory}
                  {'\n'}
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
