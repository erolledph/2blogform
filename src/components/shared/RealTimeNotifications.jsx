import React, { useState, useEffect } from 'react';
import { webSocketService } from '@/services/webSocketService';
import { realTimeAnalyticsService } from '@/services/realTimeAnalytics';
import { Bell, X, CheckCircle, AlertTriangle, Info, Users, Activity, TrendingUp } from 'lucide-react';

// Real-time notification system
export default function RealTimeNotifications({ className = '' }) {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to various real-time events
    const unsubscribeCollaborator = webSocketService.subscribe('collaborator-joined', (collaborator) => {
      addNotification({
        type: 'info',
        title: 'New Collaborator',
        message: `${collaborator.name} joined the ${collaborator.location.replace('-', ' ')}`,
        icon: Users,
        duration: 5000
      });
    });

    const unsubscribeAnalytics = realTimeAnalyticsService.subscribe('live-metrics', (metrics) => {
      // Show notification for significant traffic spikes
      if (metrics.pageViews > 5) {
        addNotification({
          type: 'success',
          title: 'Traffic Spike',
          message: `${metrics.pageViews} new page views in the last minute`,
          icon: TrendingUp,
          duration: 4000
        });
      }
    });

    const unsubscribePerformance = realTimeAnalyticsService.subscribe('performance-metrics', (performance) => {
      // Show warning for high response times
      if (performance.apiResponseTime > 200) {
        addNotification({
          type: 'warning',
          title: 'Performance Alert',
          message: `API response time: ${performance.apiResponseTime}ms`,
          icon: AlertTriangle,
          duration: 6000
        });
      }
    });

    return () => {
      unsubscribeCollaborator();
      unsubscribeAnalytics();
      unsubscribePerformance();
    };
  }, []);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    setIsVisible(true);

    // Auto-remove notification
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Hide container if no notifications
    setTimeout(() => {
      setNotifications(current => {
        if (current.length === 0) {
          setIsVisible(false);
        }
        return current;
      });
    }, 300);
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800'
        };
      case 'warning':
        return {
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-800'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-800'
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800'
        };
    }
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => {
        const config = getTypeConfig(notification.type);
        const Icon = notification.icon || Info;

        return (
          <DynamicTransition key={notification.id} transitionType="slide-right">
            <div className={`
              p-4 rounded-lg border shadow-lg backdrop-blur-sm
              ${config.bgColor} ${config.borderColor}
              transform transition-all duration-300 ease-out
            `}>
              <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <h4 className={`text-sm font-medium ${config.textColor} mb-1`}>
                      {notification.title}
                    </h4>
                  )}
                  <p className={`text-sm ${config.textColor}`}>
                    {notification.message}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                <button
                  onClick={() => removeNotification(notification.id)}
                  className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0 p-1 rounded hover:bg-black/5`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DynamicTransition>
        );
      })}
    </div>
  );
}

// Hook for managing real-time notifications
export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep max 10

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Predefined notification types
  const showSuccess = (message, title = 'Success') => {
    return addNotification({
      type: 'success',
      title,
      message,
      icon: CheckCircle,
      duration: 4000
    });
  };

  const showError = (message, title = 'Error') => {
    return addNotification({
      type: 'error',
      title,
      message,
      icon: AlertTriangle,
      duration: 6000
    });
  };

  const showWarning = (message, title = 'Warning') => {
    return addNotification({
      type: 'warning',
      title,
      message,
      icon: AlertTriangle,
      duration: 5000
    });
  };

  const showInfo = (message, title = 'Info') => {
    return addNotification({
      type: 'info',
      title,
      message,
      icon: Info,
      duration: 4000
    });
  };

  const showCollaborationUpdate = (message, collaboratorName) => {
    return addNotification({
      type: 'info',
      title: 'Collaboration Update',
      message: `${collaboratorName}: ${message}`,
      icon: Users,
      duration: 3000
    });
  };

  const showPerformanceAlert = (metric, value, threshold) => {
    return addNotification({
      type: 'warning',
      title: 'Performance Alert',
      message: `${metric} is ${value} (threshold: ${threshold})`,
      icon: Activity,
      duration: 8000,
      persistent: true
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCollaborationUpdate,
    showPerformanceAlert
  };
}