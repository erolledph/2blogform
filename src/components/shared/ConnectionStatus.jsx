import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { realTimeManager } from '@/services/realTimeService';

export default function ConnectionStatus({ className = '', showDetails = false }) {
  const [status, setStatus] = useState(realTimeManager.getConnectionStatus());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = realTimeManager.subscribe('connection', (connectionData) => {
      setStatus(realTimeManager.getConnectionStatus());
      
      // Show status temporarily when connection changes
      if (connectionData.status === 'offline' || connectionData.status === 'error') {
        setIsVisible(true);
      } else if (connectionData.status === 'connected') {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 3000);
      }
    });

    // Initial status check
    setStatus(realTimeManager.getConnectionStatus());

    return unsubscribe;
  }, []);

  const getStatusConfig = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    switch (status.status) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'connecting':
        return {
          icon: Clock,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Don't show if connected and not forced visible
  if (status.status === 'connected' && status.isOnline && !isVisible && !showDetails) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className} transition-all duration-300`}>
      <Icon className={`h-4 w-4 ${config.color} ${status.status === 'connecting' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
      
      {showDetails && (
        <div className="text-xs text-gray-500 ml-2">
          {status.pendingOperations > 0 && (
            <span>• {status.pendingOperations} pending</span>
          )}
          {status.optimisticUpdates > 0 && (
            <span>• {status.optimisticUpdates} updating</span>
          )}
          {status.lastSync && (
            <span>• Last sync: {status.lastSync.toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Mini connection indicator for header
export function ConnectionIndicator({ className = '' }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOffline) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}