import React, { useState, useEffect } from 'react';
import { Activity, Zap, Users, FolderSync as Sync, Eye, MousePointer, FileText, Package } from 'lucide-react';
import { webSocketService } from '@/services/webSocketService';

export default function LiveUpdateIndicator({ 
  type = 'activity',
  message = '',
  duration = 3000,
  position = 'bottom-right',
  className = ''
}) {
  const [visible, setVisible] = useState(true);
  const [animate, setAnimate] = useState(false);

  // Subscribe to real-time events for enhanced indicators
  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('live-event', (event) => {
      if (event.type === type || type === 'activity') {
        setVisible(true);
        setAnimate(true);
        
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);

        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, [type, duration]);

  useEffect(() => {
    setAnimate(true);
    
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const getTypeConfig = () => {
    switch (type) {
      case 'page_view':
        return {
          icon: Eye,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'interaction':
        return {
          icon: MousePointer,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'content_created':
        return {
          icon: FileText,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'product_created':
        return {
          icon: Package,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200'
        };
      case 'activity':
        return {
          icon: Activity,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'sync':
        return {
          icon: Sync,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'collaboration':
        return {
          icon: Users,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'update':
        return {
          icon: Zap,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      default:
        return {
          icon: Activity,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  if (!visible) return null;

  return (
    <div className={`fixed z-40 ${positionClasses[position]} ${className}`}>
      <div className={`
        flex items-center space-x-2 px-4 py-2 rounded-full border shadow-lg
        ${config.bgColor} ${config.borderColor}
        transition-all duration-300 ease-out
        ${animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}
      `}>
        <Icon className={`h-4 w-4 ${config.color} animate-pulse`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {message}
        </span>
      </div>
    </div>
  );
}

// Hook for showing live update indicators
export function useLiveIndicator() {
  const [indicators, setIndicators] = useState([]);

  useEffect(() => {
    // Subscribe to various real-time events
    const unsubscribe = webSocketService.subscribe('live-event', (event) => {
      showIndicator(event.type, getEventMessage(event), 3000);
    });

    return unsubscribe;
  }, []);

  const getEventMessage = (event) => {
    switch (event.type) {
      case 'page_view':
        return 'New page view recorded';
      case 'interaction':
        return 'User interaction detected';
      case 'content_created':
        return 'New content published';
      case 'product_created':
        return 'New product added';
      case 'user_joined':
        return `${event.data.userName} joined`;
      default:
        return 'Live update received';
    }
  };

  const showIndicator = (type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    const indicator = { id, type, message, duration };
    
    setIndicators(prev => [...prev, indicator]);
    
    setTimeout(() => {
      setIndicators(prev => prev.filter(i => i.id !== id));
    }, duration + 300); // Extra time for fade out
    
    return id;
  };

  const removeIndicator = (id) => {
    setIndicators(prev => prev.filter(i => i.id !== id));
  };

  return {
    indicators,
    showIndicator,
    removeIndicator
  };
}