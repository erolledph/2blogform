import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { webSocketService } from '@/services/webSocketService';
import { Activity, TrendingUp, Users, Eye, MousePointer, Zap } from 'lucide-react';

// Live analytics dashboard with streaming updates
export default function LiveAnalyticsDashboard({ blogId, className = '' }) {
  const [liveMetrics, setLiveMetrics] = useState({
    totalViews: 0,
    todayViews: 0,
    totalInteractions: 0,
    todayInteractions: 0,
    activeUsers: 0,
    peakHour: 0
  });
  
  const [chartData, setChartData] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Subscribe to live analytics events
    const unsubscribeLiveEvent = webSocketService.subscribe('live-event', (event) => {
      handleLiveEvent(event);
    });

    // Initialize with sample data
    initializeSampleData();

    return unsubscribeLiveEvent;
  }, [blogId]);

  const initializeSampleData = () => {
    // Generate sample chart data for the last 24 hours
    const now = new Date();
    const sampleData = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
      sampleData.push({
        time: time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        views: Math.floor(Math.random() * 50) + 10,
        interactions: Math.floor(Math.random() * 20) + 5,
        timestamp: time
      });
    }
    
    setChartData(sampleData);
    
    // Set initial metrics
    setLiveMetrics({
      totalViews: sampleData.reduce((sum, point) => sum + point.views, 0),
      todayViews: sampleData.slice(-8).reduce((sum, point) => sum + point.views, 0),
      totalInteractions: sampleData.reduce((sum, point) => sum + point.interactions, 0),
      todayInteractions: sampleData.slice(-8).reduce((sum, point) => sum + point.interactions, 0),
      activeUsers: Math.floor(Math.random() * 10) + 1,
      peakHour: Math.floor(Math.random() * 24)
    });
  };

  const handleLiveEvent = (event) => {
    setIsLive(true);
    
    // Add to live events feed
    setLiveEvents(prev => [
      {
        id: Date.now(),
        type: event.type,
        data: event.data,
        timestamp: event.timestamp
      },
      ...prev.slice(0, 49) // Keep last 50 events
    ]);

    // Update metrics based on event type
    switch (event.type) {
      case 'page_view':
        handleLivePageView(event.data);
        break;
      case 'interaction':
        handleLiveInteraction(event.data);
        break;
      case 'user_joined':
        handleUserJoined(event.data);
        break;
      case 'user_left':
        handleUserLeft(event.data);
        break;
    }

    // Reset live indicator after 3 seconds
    setTimeout(() => setIsLive(false), 3000);
  };

  const handleLivePageView = (viewData) => {
    // Update chart data
    setChartData(prev => {
      const now = new Date();
      const currentHour = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
      
      const updated = [...prev];
      const lastPoint = updated[updated.length - 1];
      
      if (lastPoint && lastPoint.time === currentHour) {
        lastPoint.views += 1;
      } else {
        updated.push({
          time: currentHour,
          views: 1,
          interactions: 0,
          timestamp: now
        });
        
        // Keep only last 24 hours
        if (updated.length > 24) {
          updated.shift();
        }
      }
      
      return updated;
    });

    // Update metrics
    setLiveMetrics(prev => ({
      ...prev,
      totalViews: prev.totalViews + 1,
      todayViews: prev.todayViews + 1
    }));
  };

  const handleLiveInteraction = (interactionData) => {
    // Update chart data
    setChartData(prev => {
      const now = new Date();
      const currentHour = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
      
      const updated = [...prev];
      const lastPoint = updated[updated.length - 1];
      
      if (lastPoint && lastPoint.time === currentHour) {
        lastPoint.interactions += 1;
      } else {
        updated.push({
          time: currentHour,
          views: 0,
          interactions: 1,
          timestamp: now
        });
        
        if (updated.length > 24) {
          updated.shift();
        }
      }
      
      return updated;
    });

    // Update metrics
    setLiveMetrics(prev => ({
      ...prev,
      totalInteractions: prev.totalInteractions + 1,
      todayInteractions: prev.todayInteractions + 1
    }));
  };

  const handleUserJoined = (userData) => {
    setLiveMetrics(prev => ({
      ...prev,
      activeUsers: prev.activeUsers + 1
    }));
  };

  const handleUserLeft = (userData) => {
    setLiveMetrics(prev => ({
      ...prev,
      activeUsers: Math.max(0, prev.activeUsers - 1)
    }));
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'page_view':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'interaction':
        return <MousePointer className="h-4 w-4 text-green-600" />;
      case 'user_joined':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'user_left':
        return <Users className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventDescription = (event) => {
    switch (event.type) {
      case 'page_view':
        return `Page viewed: ${event.data.contentId?.substring(0, 8)}...`;
      case 'interaction':
        return `${event.data.type} interaction on content`;
      case 'user_joined':
        return `${event.data.userName} joined ${event.data.location}`;
      case 'user_left':
        return `User left ${event.data.location}`;
      default:
        return 'Unknown event';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center space-x-2 text-sm text-green-600 animate-pulse">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live updates active</span>
        </div>
      )}

      {/* Live metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-900">{liveMetrics.totalViews}</div>
          <div className="text-sm text-blue-600">Total Views</div>
        </div>
        
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-900">{liveMetrics.todayViews}</div>
          <div className="text-sm text-green-600">Today's Views</div>
        </div>
        
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-900">{liveMetrics.totalInteractions}</div>
          <div className="text-sm text-purple-600">Interactions</div>
        </div>
        
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-900">{liveMetrics.todayInteractions}</div>
          <div className="text-sm text-orange-600">Today's Interactions</div>
        </div>
        
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-900">{liveMetrics.activeUsers}</div>
          <div className="text-sm text-indigo-600">Active Users</div>
        </div>
        
        <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg text-center">
          <div className="text-2xl font-bold text-pink-900">{liveMetrics.peakHour}:00</div>
          <div className="text-sm text-pink-600">Peak Hour</div>
        </div>
      </div>

      {/* Live chart */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Live Activity (Last 24 Hours)</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isLive ? 'Live' : 'Waiting for updates'}
              </span>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Views"
                />
                <Area
                  type="monotone"
                  dataKey="interactions"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Interactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live events feed */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Live Events Feed</h3>
            <button
              onClick={() => setLiveEvents([])}
              className="btn-ghost btn-sm"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {liveEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent events</p>
                <p className="text-xs">Live events will appear here as they occur</p>
              </div>
            ) : (
              liveEvents.map((event) => (
                <DynamicTransition key={event.id} transitionType="slide-down">
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">
                        {getEventDescription(event)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </DynamicTransition>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Real-time performance monitoring component
export function RealTimePerformanceMonitor({ className = '' }) {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    apiResponseTime: 0,
    memoryUsage: 0,
    activeConnections: 0,
    errorRate: 0,
    cpuUsage: 0
  });

  const [performanceHistory, setPerformanceHistory] = useState([]);

  useEffect(() => {
    // Simulate performance monitoring
    const interval = setInterval(() => {
      updatePerformanceMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updatePerformanceMetrics = () => {
    const now = new Date();
    const newMetrics = {
      apiResponseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      memoryUsage: Math.floor(Math.random() * 30) + 40, // 40-70%
      activeConnections: Math.floor(Math.random() * 50) + 10, // 10-60
      errorRate: Math.random() * 2, // 0-2%
      cpuUsage: Math.floor(Math.random() * 20) + 10, // 10-30%
      timestamp: now
    };

    setPerformanceMetrics(newMetrics);
    
    // Update history
    setPerformanceHistory(prev => [
      ...prev.slice(-19), // Keep last 20 points
      {
        time: now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        ...newMetrics
      }
    ]);
  };

  const getMetricStatus = (value, thresholds) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 border rounded-lg ${getStatusColor(getMetricStatus(performanceMetrics.apiResponseTime, { warning: 150, critical: 300 }))}`}>
          <div className="text-lg font-bold">{performanceMetrics.apiResponseTime}ms</div>
          <div className="text-sm">API Response</div>
        </div>
        
        <div className={`p-4 border rounded-lg ${getStatusColor(getMetricStatus(performanceMetrics.memoryUsage, { warning: 70, critical: 85 }))}`}>
          <div className="text-lg font-bold">{performanceMetrics.memoryUsage}%</div>
          <div className="text-sm">Memory Usage</div>
        </div>
        
        <div className={`p-4 border rounded-lg ${getStatusColor(getMetricStatus(performanceMetrics.activeConnections, { warning: 80, critical: 100 }))}`}>
          <div className="text-lg font-bold">{performanceMetrics.activeConnections}</div>
          <div className="text-sm">Active Connections</div>
        </div>
        
        <div className={`p-4 border rounded-lg ${getStatusColor(getMetricStatus(performanceMetrics.errorRate, { warning: 1, critical: 3 }))}`}>
          <div className="text-lg font-bold">{performanceMetrics.errorRate.toFixed(2)}%</div>
          <div className="text-sm">Error Rate</div>
        </div>
        
        <div className={`p-4 border rounded-lg ${getStatusColor(getMetricStatus(performanceMetrics.cpuUsage, { warning: 60, critical: 80 }))}`}>
          <div className="text-lg font-bold">{performanceMetrics.cpuUsage}%</div>
          <div className="text-sm">CPU Usage</div>
        </div>
      </div>

      {/* Performance trend chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Trends</h3>
          <p className="card-description">Real-time system performance monitoring</p>
        </div>
        <div className="card-content">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="apiResponseTime"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="API Response Time (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="memoryUsage"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Memory Usage (%)"
                />
                <Line
                  type="monotone"
                  dataKey="cpuUsage"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="CPU Usage (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}