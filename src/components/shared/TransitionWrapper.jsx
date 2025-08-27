import React, { useState, useEffect } from 'react';

export default function TransitionWrapper({ 
  children, 
  loading = false, 
  error = null,
  skeleton = null,
  className = '',
  transitionType = 'fade'
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
          {skeleton || (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {showError && (
        <div className={getTransitionClasses(!!error)}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
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

// Specialized transition components
export function SlidePanel({ isOpen, onClose, children, side = 'right' }) {
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

  if (!mounted && !isOpen) return null;

  const slideClasses = {
    right: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`,
    left: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`,
    top: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-y-0' : '-translate-y-full'
    }`,
    bottom: `transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-y-0' : 'translate-y-full'
    }`
  };

  const positionClasses = {
    right: 'right-0 top-0 h-full',
    left: 'left-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full'
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
      <div className={`absolute ${positionClasses[side]} ${slideClasses[side]} bg-white shadow-xl max-w-md w-full`}>
        {children}
      </div>
    </div>
  );
}

export function FadeTransition({ show, children, className = '' }) {
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
    <div className={`transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
}