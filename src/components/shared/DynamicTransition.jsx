import React, { useState, useEffect } from 'react';

// Enhanced transition wrapper for smooth state changes
export default function DynamicTransition({ 
  children, 
  loading = false, 
  error = null,
  skeleton = null,
  className = '',
  transitionType = 'fade',
  duration = 300,
  delay = 0
}) {
  const [showSkeleton, setShowSkeleton] = useState(loading);
  const [showError, setShowError] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      setShowSkeleton(false);
      setShowContent(false);
    } else if (loading) {
      setShowSkeleton(true);
      setShowError(false);
      setShowContent(false);
    } else {
      // Smooth transition from loading to content
      setTimeout(() => {
        setShowSkeleton(false);
        setShowError(false);
        setTimeout(() => setShowContent(true), 50);
      }, delay);
    }
  }, [loading, error, delay]);

  const getTransitionClasses = (visible, type = transitionType) => {
    const baseClasses = `transition-all ease-in-out`;
    const durationClass = `duration-${duration}`;
    
    switch (type) {
      case 'fade':
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100' : 'opacity-0'}`;
      case 'slide-up':
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;
      case 'slide-down':
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`;
      case 'scale':
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`;
      case 'slide-right':
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`;
      default:
        return `${baseClasses} ${durationClass} ${visible ? 'opacity-100' : 'opacity-0'}`;
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

      {/* Error State */}
      {showError && (
        <div className={getTransitionClasses(!!error, 'slide-up')}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={getTransitionClasses(showContent && !loading && !error, 'slide-up')}>
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