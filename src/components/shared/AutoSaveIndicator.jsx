import React from 'react';
import { Check, AlertTriangle, Clock, Wifi, WifiOff, RotateCcw } from 'lucide-react';

export default function AutoSaveIndicator({ 
  status = 'saved',
  lastSaved = null,
  showRetryButton = false,
  onRetry = null,
  retryCount = 0,
  isOnline = true,
  className = ''
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Clock,
          text: 'Saving...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          animate: 'animate-pulse'
        };
      case 'saved':
        return {
          icon: Check,
          text: 'Saved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          animate: ''
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Save failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          animate: ''
        };
      case 'retrying':
        return {
          icon: RotateCcw,
          text: `Retrying... (${retryCount})`,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          animate: 'animate-spin'
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'Pending...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          animate: 'animate-pulse'
        };
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Auto-save status */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor}`}>
        <Icon className={`h-4 w-4 ${config.color} ${config.animate}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        {lastSaved && status === 'saved' && (
          <span className="text-xs text-muted-foreground">
            Retry
          </span>
        )}
      </div>

      {/* Online/offline indicator */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${
        isOnline 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${
          isOnline ? 'text-green-600' : 'text-red-600'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Retry button for errors */}
      {showRetryButton && onRetry && (
        <button
          onClick={onRetry}
          className="btn-ghost btn-sm"
          title="Retry save"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
