import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getUserFriendlyErrorMessage } from '@/utils/helpers';

// Enhanced transition wrapper for smooth state changes
export default function DynamicTransition({ 
  children, 
  loading = false, 
  error = null,
  skeleton = null,
  className = '',
  transitionType = 'fade',
  onRetry = null
}) {
  const [showSkeleton, setShowSkeleton] = useState(loading);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      setShowSkeleton(false);
    } else if (loading) {
      setShowSkeleton(true);
      setShowError(false);
    } else {
      // Delay skeleton removal for smooth transition
      setTimeout(() => {
        setShowSkeleton(false);
        setShowError(false);
      }, 150);
    }
  }, [loading, error]);

  const getTransitionClasses = (visible) => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    switch (transitionType) {
      case 'fade':
        return `${baseClasses} ${visible ? 'opacity-100' : 'opacity-0'}`;
      case 'slide-up':
        return `${baseClasses} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;
      case 'scale':
        return `${baseClasses} ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`;
      default:
        return `${baseClasses} ${visible ? 'opacity-100' : 'opacity-0'}`;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Skeleton/Loading State */}
      {showSkeleton && (
        <div className={getTransitionClasses(loading)}>
          {skeleton || <DefaultSkeleton />}
        </div>
      )}

      {/* Enhanced Error State */}
      {showError && (
        <div className={getTransitionClasses(!!error)}>
          <div className="card border-red-200 bg-red-50">
            <div className="card-content p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-bold text-red-800 mb-2">Error Loading Data</h3>
              <p className="text-red-700 mb-6">{getUserFriendlyErrorMessage({ message: error })}</p>
              {onRetry && (
                <button onClick={onRetry} className="btn-secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={getTransitionClasses(!loading && !error)}>
        {children}
      </div>
    </div>
  );
}

// Default skeleton component
function DefaultSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  );
}

// Slide panel for dynamic editing
export function SlidePanel({ 
  isOpen, 
  onClose, 
  children, 
  side = 'right',
  size = 'md',
  title = null,
  showCloseButton = true
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setTimeout(() => setMounted(false), 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted && !isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const slideClasses = {
    right: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`,
    left: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`
  };

  const positionClasses = {
    right: 'right-0 top-0 h-full',
    left: 'left-0 top-0 h-full'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`absolute ${positionClasses[side]} ${slideClasses[side]} bg-white shadow-xl ${sizeClasses[size]} w-full`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Fade transition component
export function FadeTransition({ show, children, className = '', duration = 300 }) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div className={`transition-opacity duration-${duration} ${show ? 'opacity-100' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
}

// Scale transition for modal-like content
export function ScaleTransition({ show, children, className = '' }) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div className={`transition-all duration-200 ease-out ${
      show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    } ${className}`}>
      {children}
    </div>
  );
}

// Staggered animation for lists
export function StaggeredTransition({ children, staggerDelay = 50, className = '' }) {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleItems(prev => {
        if (prev < React.Children.count(children)) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, staggerDelay);

    return () => clearInterval(timer);
  }, [children, staggerDelay]);

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ease-out ${
            index < visibleItems 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Loading overlay for in-place updates
export function LoadingOverlay({ show, children, message = 'Loading...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {show && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Success animation component
export function SuccessAnimation({ show, children, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 2000);
    }
  }, [show]);

  return (
    <div className={`relative ${className}`}>
      {children}
      {isVisible && (
        <div className="absolute inset-0 bg-green-500/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg animate-pulse">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-700 font-medium">Success!</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Error animation component
export function ErrorAnimation({ show, children, message = 'Error occurred', className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    }
  }, [show]);

  return (
    <div className={`relative ${className}`}>
      {children}
      {isVisible && (
        <div className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm text-red-700 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Optimistic update indicator
export function OptimisticUpdateIndicator({ show, className = '' }) {
  if (!show) return null;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 ${className}`}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <span className="text-xs text-blue-700 font-medium">Updating...</span>
    </div>
  );
}

// Real-time sync indicator
export function SyncIndicator({ status = 'synced', className = '' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Syncing...',
          animate: 'animate-pulse'
        };
      case 'synced':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Synced',
          animate: ''
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Sync Error',
          animate: ''
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} ${config.animate}`}></div>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}

// Micro-interaction wrapper
export function MicroInteraction({ children, type = 'hover', className = '' }) {
  const [isActive, setIsActive] = useState(false);

  const handleInteraction = () => {
    setIsActive(true);
    setTimeout(() => setIsActive(false), 200);
  };

  const interactionClasses = {
    hover: 'hover:scale-105 hover:shadow-lg transition-all duration-200',
    press: 'active:scale-95 transition-transform duration-100',
    bounce: isActive ? 'animate-bounce' : '',
    pulse: isActive ? 'animate-pulse' : ''
  };

  return (
    <div 
      className={`${interactionClasses[type]} ${className}`}
      onClick={type === 'press' || type === 'bounce' || type === 'pulse' ? handleInteraction : undefined}
    >
      {children}
    </div>
  );
}

// Progress transition for multi-step operations
export function ProgressTransition({ 
  steps = [], 
  currentStep = 0, 
  className = '' 
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
              isCompleted
                ? 'bg-green-50 border-green-200'
                : isCurrent
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm ${
                isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Data refresh indicator
export function DataRefreshIndicator({ 
  lastRefresh = null, 
  isRefreshing = false, 
  onRefresh = null,
  className = '' 
}) {
  const timeAgo = lastRefresh ? 
    Math.floor((Date.now() - lastRefresh.getTime()) / 1000) : null;

  const getTimeAgoText = (seconds) => {
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`inline-flex items-center space-x-2 text-xs text-muted-foreground ${className}`}>
      {isRefreshing ? (
        <>
          <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Refreshing...</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>
            {lastRefresh ? `Updated ${getTimeAgoText(timeAgo)}` : 'Ready'}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-blue-600 hover:text-blue-800 transition-colors ml-2"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Batch operation progress indicator
export function BatchProgressIndicator({ 
  total = 0, 
  completed = 0, 
  failed = 0, 
  className = '' 
}) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const hasErrors = failed > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {completed} of {total} completed
        </span>
        {hasErrors && (
          <span className="text-red-600">
            {failed} failed
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            hasErrors ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Enhanced transition wrapper with multiple states
export function MultiStateTransition({ 
  state = 'idle', // idle, loading, success, error
  children,
  loadingComponent = null,
  successComponent = null,
  errorComponent = null,
  className = ''
}) {
  const [currentState, setCurrentState] = useState(state);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state === 'success') {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentState('idle');
      }, 2000);
    } else {
      setCurrentState(state);
      setShowSuccess(false);
    }
  }, [state]);

  return (
    <div className={`relative ${className}`}>
      {/* Main content */}
      <div className={`transition-opacity duration-300 ${
        currentState === 'loading' ? 'opacity-50' : 'opacity-100'
      }`}>
        {children}
      </div>

      {/* Loading overlay */}
      {currentState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          {loadingComponent || (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )}
        </div>
      )}

      {/* Success overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-sm rounded-lg animate-pulse">
          {successComponent || (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-700 font-medium">Success!</p>
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {currentState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm rounded-lg">
          {errorComponent || (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-red-700 font-medium">Error occurred</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Skeleton to content transition
export function SkeletonToContentTransition({ 
  loading, 
  skeleton, 
  children, 
  className = '' 
}) {
  const [showSkeleton, setShowSkeleton] = useState(loading);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setShowSkeleton(false), 150);
    } else {
      setShowSkeleton(true);
    }
  }, [loading]);

  return (
    <div className={`relative ${className}`}>
      {/* Skeleton */}
      {showSkeleton && (
        <div className={`transition-opacity duration-300 ${
          loading ? 'opacity-100' : 'opacity-0'
        }`}>
          {skeleton}
        </div>
      )}
      
      {/* Content */}
      <div className={`transition-opacity duration-300 ${
        loading ? 'opacity-0' : 'opacity-100'
      } ${showSkeleton ? 'absolute inset-0' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Page transition wrapper
export function PageTransition({ children, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`transition-all duration-500 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    } ${className}`}>
      {children}
    </div>
  );
}

// List item transition for dynamic lists
export function ListItemTransition({ 
  children, 
  index = 0, 
  staggerDelay = 50,
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * staggerDelay);

    return () => clearTimeout(timer);
  }, [index, staggerDelay]);

  return (
    <div className={`transition-all duration-300 ease-out ${
      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
    } ${className}`}>
      {children}
    </div>
  );
}

// Modal transition wrapper
export function ModalTransition({ show, children, className = '' }) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${
        show ? 'opacity-50' : 'opacity-0'
      }`} />
      
      {/* Modal content */}
      <div className={`relative z-10 flex items-center justify-center min-h-screen p-4 transition-all duration-300 ${
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {children}
      </div>
    </div>
  );
}

// Content state transition (empty, loading, error, content)
export function ContentStateTransition({ 
  state = 'loading', // loading, empty, error, content
  children,
  emptyComponent = null,
  errorComponent = null,
  loadingComponent = null,
  className = ''
}) {
  const getStateComponent = () => {
    switch (state) {
      case 'loading':
        return loadingComponent || (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        );
      case 'empty':
        return emptyComponent || (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data available</p>
          </div>
        );
      case 'error':
        return errorComponent || (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600">Error loading data</p>
          </div>
        );
      case 'content':
        return children;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unknown state</p>
          </div>
        );
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${className}`}>
      {getStateComponent()}
    </div>
  );
}