import React, { useState, useEffect } from 'react';
import { realTimeManager } from '@/services/realTimeService';
import { Activity, Users, FolderSync as Sync, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function RealTimeStatusBar({ className = '' }) {
  const [status, setStatus] = useState(realTimeManager.getConnectionStatus());
  const [recentActivity, setRecentActivity] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribeConnection = realTimeManager.subscribe('connection', (connectionData) => {
      setStatus(realTimeManager.getConnectionStatus());
      
      // Show status bar when there are connection issues
      if (connectionData.status === 'offline' || connectionData.status === 'error') {
        setIsVisible(true);
      } else if (connectionData.status === 'connected') {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 5000);
      }
    });

    // Subscribe to operation updates
    const unsubscribeOperations = realTimeManager.subscribe('operation-success', (operation) => {
      setRecentActivity(prev => [
        {
          id: Date.now(),
          type: operation.type,
          message: operation.successMessage || 'Operation completed',
          timestamp: new Date()
        },
        ...prev.slice(0, 4) // Keep last 5 activities
      ]);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeOperations();
    };
  }, []);

  const getStatusIcon = () => {
    if (!status.isOnline) return WifiOff;
    
    switch (status.status) {
      case 'connected':
        return CheckCircle;
      case 'connecting':
        return Clock;
      case 'error':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getStatusColor = () => {
    if (!status.isOnline) return 'text-red-600';
    
    switch (status.status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const StatusIcon = getStatusIcon();

  if (!isVisible && status.status === 'connected' && status.isOnline) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <div className="bg-white border border-border rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center space-x-3 mb-3">
          <StatusIcon className={`h-5 w-5 ${getStatusColor()}`} />
          <div>
            <div className="text-sm font-medium text-foreground">
              {status.isOnline ? 'System Status' : 'Offline Mode'}
            </div>
            <div className={`text-xs ${getStatusColor()}`}>
              {status.isOnline ? status.status : 'Working offline'}
            </div>
          </div>
        </div>

        {/* Connection Details */}
        {status.isOnline && (
          <div className="space-y-2 text-xs text-muted-foreground">
            {status.pendingOperations > 0 && (
              <div className="flex items-center space-x-2">
                <Sync className="h-3 w-3 animate-spin" />
                <span>{status.pendingOperations} operations pending</span>
              </div>
            )}
            {status.optimisticUpdates > 0 && (
              <div className="flex items-center space-x-2">
                <Activity className="h-3 w-3" />
                <span>{status.optimisticUpdates} updates in progress</span>
              </div>
            )}
            {status.lastSync && (
              <div>
                Last sync: {status.lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-foreground mb-2">Recent Activity</div>
            <div className="space-y-1">
              {recentActivity.slice(0, 3).map(activity => (
                <div key={activity.id} className="text-xs text-muted-foreground">
                  {activity.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Queue */}
        {!status.isOnline && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-amber-600">
              Changes will sync when connection is restored
            </div>
          </div>
        )}
      </div>
    </div>
  );
}