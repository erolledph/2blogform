import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// Enhanced notification system with contextual actions
export default function SmartNotification({
  id,
  type = 'info',
  title,
  message,
  actions = [],
  autoClose = true,
  duration = 4000,
  position = 'top-right',
  priority = 'medium',
  persistent = false,
  onClose,
  context = null,
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (autoClose && duration > 0 && !persistent && !isPaused) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleClose();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [autoClose, duration, persistent, isPaused]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose(id);
    }, 300);
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          progressColor: 'bg-green-500'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          progressColor: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-800',
          progressColor: 'bg-amber-500'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          progressColor: 'bg-blue-500'
        };
      case 'offline':
        return {
          icon: WifiOff,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          textColor: 'text-gray-800',
          progressColor: 'bg-gray-500'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const getPriorityClasses = () => {
    switch (priority) {
      case 'high':
        return 'ring-2 ring-red-200 shadow-lg';
      case 'medium':
        return 'shadow-md';
      case 'low':
        return 'shadow-sm';
      default:
        return 'shadow-md';
    }
  };
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed z-50 max-w-sm w-full ${positionClasses[position]}`}>
      <div className={`
        transform transition-all duration-300 ease-in-out
        ${visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${getPriorityClasses()}
      `}>
        {/* Connection status indicator */}
        {/* Progress bar */}
        {autoClose && duration > 0 && !persistent && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
            <div 
              className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div 
          className="flex items-start space-x-3"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className={`text-sm font-medium ${config.textColor} mb-1`}>
                {title}
              </h4>
            )}
            <p className={`text-sm ${config.textColor}`}>
              {message}
            </p>
            
            {/* Contextual Actions */}
            {actions.length > 0 && (
              <div className="flex space-x-2 mt-3">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      if (action.closeOnClick !== false) {
                        handleClose();
                      }
                    }}
                    className={`text-xs font-medium px-3 py-1 rounded ${
                      action.primary 
                        ? `${config.progressColor} text-white hover:opacity-90` 
                        : `${config.textColor} hover:underline`
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0 p-1 rounded hover:bg-black/5`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification manager for handling multiple notifications
class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.maxNotifications = 5;
    this.queue = [];
  }

  show(notification) {
    const id = notification.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.notifications.set(id, {
      ...notification,
      id,
      timestamp: Date.now()
    });

    // Limit number of visible notifications
    if (this.notifications.size > this.maxNotifications) {
      const oldestId = Array.from(this.notifications.keys())[0];
      this.notifications.delete(oldestId);
    }

    return id;
  }

  remove(id) {
    this.notifications.delete(id);
    
    // Process queue if there are waiting notifications
    if (this.queue.length > 0) {
      const nextNotification = this.queue.shift();
      this.show(nextNotification);
    }
  }

  clear() {
    this.notifications.clear();
    this.queue = [];
  }

  // Queue notification if too many are visible
  queue(notification) {
    if (this.notifications.size >= this.maxNotifications) {
      this.queue.push(notification);
    } else {
      this.show(notification);
    }
  }

  // Context-aware notification
  showContextual(message, type, context) {
    const actions = this.getContextualActions(context);
    
    return this.show({
      type,
      message,
      actions,
      context
    });
  }

  getContextualActions(context) {
    if (!context) return [];

    switch (context.area) {
      case 'content-editor':
        return [
          {
            label: 'View Content',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = `/dashboard/manage`;
              }
            },
            primary: true
          }
        ];
      case 'product-manager':
        return [
          {
            label: 'View Products',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = `/dashboard/manage-products`;
              }
            },
            primary: true
          }
        ];
      case 'file-storage':
        return [
          {
            label: 'Open Storage',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = `/dashboard/storage`;
              }
            },
            primary: true
          }
        ];
      default:
        return [];
    }
  }
}

export const notificationManager = new NotificationManager();

// Hook for using smart notifications
export function useSmartNotifications() {
  const showNotification = (message, type = 'info', options = {}) => {
    return notificationManager.show({
      message,
      type,
      ...options
    });
  };

  const showContextualNotification = (message, type, context) => {
    return notificationManager.showContextual(message, type, context);
  };

  const showPersistentNotification = (message, type, actions = []) => {
    return notificationManager.show({
      message,
      type,
      actions,
      persistent: true,
      autoClose: false
    });
  };
  return {
    showNotification,
    showContextualNotification,
    showPersistentNotification,
    clearAll: () => notificationManager.clear()
  };
}