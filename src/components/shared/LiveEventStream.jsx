import React, { useState, useEffect, useRef } from 'react';
import { useLiveEventStream } from '@/hooks/useRealTimeCollaboration';
import { Activity, Eye, MousePointer, Users, FileText, Package, Zap, Filter } from 'lucide-react';

// Live event streaming component
export default function LiveEventStream({ 
  eventTypes = [], 
  maxEvents = 50,
  autoScroll = true,
  className = '' 
}) {
  const { events, isConnected, clearEvents } = useLiveEventStream(eventTypes);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(new Set(eventTypes));
  const [showFilters, setShowFilters] = useState(false);
  const eventsContainerRef = useRef(null);

  useEffect(() => {
    // Filter events based on selected types
    if (selectedTypes.size === 0) {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => selectedTypes.has(event.type)));
    }
  }, [events, selectedTypes]);

  useEffect(() => {
    // Auto-scroll to bottom when new events arrive
    if (autoScroll && eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScroll]);

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
      case 'content_created':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'content_updated':
        return <FileText className="h-4 w-4 text-amber-600" />;
      case 'product_created':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'product_updated':
        return <Package className="h-4 w-4 text-orange-600" />;
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
      case 'content_created':
        return `New content created: ${event.data.title?.substring(0, 30)}...`;
      case 'content_updated':
        return `Content updated: ${event.data.title?.substring(0, 30)}...`;
      case 'product_created':
        return `New product added: ${event.data.name?.substring(0, 30)}...`;
      case 'product_updated':
        return `Product updated: ${event.data.name?.substring(0, 30)}...`;
      default:
        return 'Unknown event';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'page_view':
        return 'border-l-blue-500 bg-blue-50';
      case 'interaction':
        return 'border-l-green-500 bg-green-50';
      case 'user_joined':
        return 'border-l-purple-500 bg-purple-50';
      case 'user_left':
        return 'border-l-gray-500 bg-gray-50';
      case 'content_created':
      case 'content_updated':
        return 'border-l-blue-500 bg-blue-50';
      case 'product_created':
      case 'product_updated':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const toggleEventType = (eventType) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventType)) {
        newSet.delete(eventType);
      } else {
        newSet.add(eventType);
      }
      return newSet;
    });
  };

  const availableEventTypes = [
    'page_view',
    'interaction', 
    'user_joined',
    'user_left',
    'content_created',
    'content_updated',
    'product_created',
    'product_updated'
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Live Events</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost btn-sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={clearEvents}
            className="btn-ghost btn-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Event type filters */}
      {showFilters && (
        <DynamicTransition show={showFilters} transitionType="slide-down">
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Filter by Event Type</h4>
            <div className="flex flex-wrap gap-2">
              {availableEventTypes.map((eventType) => (
                <button
                  key={eventType}
                  onClick={() => toggleEventType(eventType)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTypes.has(eventType)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {eventType.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </DynamicTransition>
      )}

      {/* Events list */}
      <div className="card">
        <div className="card-content p-0">
          <div 
            ref={eventsContainerRef}
            className="max-h-96 overflow-y-auto"
          >
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events to display</p>
                <p className="text-xs">Live events will appear here as they occur</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEvents.map((event, index) => (
                  <DynamicTransition 
                    key={event.id} 
                    transitionType="slide-down"
                    delay={index * 50}
                  >
                    <div className={`p-3 border-l-4 ${getEventColor(event.type)} border-b border-border last:border-b-0`}>
                      <div className="flex items-center space-x-3">
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
                    </div>
                  </DynamicTransition>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-900">
            {events.filter(e => e.type === 'page_view').length}
          </div>
          <div className="text-xs text-blue-600">Page Views</div>
        </div>
        
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-lg font-bold text-green-900">
            {events.filter(e => e.type === 'interaction').length}
          </div>
          <div className="text-xs text-green-600">Interactions</div>
        </div>
        
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-900">
            {events.filter(e => e.type.includes('user')).length}
          </div>
          <div className="text-xs text-purple-600">User Events</div>
        </div>
        
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <div className="text-lg font-bold text-orange-900">
            {events.filter(e => e.type.includes('content') || e.type.includes('product')).length}
          </div>
          <div className="text-xs text-orange-600">Content Events</div>
        </div>
      </div>
    </div>
  );
}