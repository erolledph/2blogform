import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '@/services/webSocketService';
import { debounce } from '@/utils/helpers';

// Hook for real-time collaborative editing
export function useRealTimeCollaboration(contentId, location = 'content-editor') {
  const [collaborators, setCollaborators] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [lastEdit, setLastEdit] = useState(null);
  const [editLock, setEditLock] = useState(null);

  useEffect(() => {
    // Subscribe to collaboration events
    const unsubscribeJoined = webSocketService.subscribe('collaborator-joined', (collaborator) => {
      if (collaborator.location === location) {
        setCollaborators(prev => {
          const filtered = prev.filter(c => c.id !== collaborator.id);
          return [...filtered, collaborator];
        });
      }
    });

    const unsubscribeLeft = webSocketService.subscribe('collaborator-left', (collaborator) => {
      setCollaborators(prev => prev.filter(c => c.id !== collaborator.id));
    });

    const unsubscribeCursor = webSocketService.subscribe('cursor-update', (cursorData) => {
      setCollaborators(prev => prev.map(c => 
        c.id === cursorData.userId 
          ? { ...c, cursor: cursorData.position, lastActivity: cursorData.timestamp }
          : c
      ));
    });

    const unsubscribeTyping = webSocketService.subscribe('typing-status', (typingData) => {
      if (typingData.location === location) {
        setCollaborators(prev => prev.map(c => 
          c.id === typingData.userId 
            ? { ...c, isTyping: typingData.isTyping }
            : c
        ));
      }
    });

    // Update presence for current location
    webSocketService.updatePresence({
      userId: webSocketService.userId,
      userName: 'Current User',
      location,
      contentId,
      lastSeen: new Date(),
      isActive: true
    });

    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribeCursor();
      unsubscribeTyping();
    };
  }, [contentId, location]);

  // Debounced typing indicator
  const debouncedStopTyping = useCallback(
    debounce(() => {
      setIsTyping(false);
      webSocketService.notifySubscribers('typing-status', {
        userId: webSocketService.userId,
        isTyping: false,
        location
      });
    }, 2000),
    [location]
  );

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      webSocketService.notifySubscribers('typing-status', {
        userId: webSocketService.userId,
        isTyping: true,
        location
      });
    }
    debouncedStopTyping();
  }, [isTyping, location, debouncedStopTyping]);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    webSocketService.notifySubscribers('typing-status', {
      userId: webSocketService.userId,
      isTyping: false,
      location
    });
  }, [location]);

  // Handle cursor movement
  const updateCursor = useCallback((position) => {
    webSocketService.broadcastCursorPosition(position);
  }, []);

  // Detect and handle conflicts
  const detectConflict = useCallback((localData, serverData) => {
    if (!localData || !serverData) return false;
    
    const localTimestamp = new Date(localData.updatedAt || 0);
    const serverTimestamp = new Date(serverData.updatedAt || 0);
    
    // If server data is newer and different from local data
    if (serverTimestamp > localTimestamp && 
        JSON.stringify(localData) !== JSON.stringify(serverData)) {
      
      const conflict = {
        id: Date.now(),
        type: 'concurrent_edit',
        localData,
        serverData,
        timestamp: new Date()
      };
      
      setConflicts(prev => [...prev, conflict]);
      return true;
    }
    
    return false;
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback((conflictId, resolution) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    return resolution;
  }, []);

  // Request edit lock
  const requestEditLock = useCallback(async (fieldName) => {
    // Simulate edit lock request
    const lockData = {
      fieldName,
      userId: webSocketService.userId,
      timestamp: new Date(),
      expires: new Date(Date.now() + 30000) // 30 seconds
    };
    
    setEditLock(lockData);
    
    // Auto-release lock after timeout
    setTimeout(() => {
      setEditLock(null);
    }, 30000);
    
    return lockData;
  }, []);

  // Release edit lock
  const releaseEditLock = useCallback(() => {
    setEditLock(null);
  }, []);

  return {
    collaborators,
    conflicts,
    isTyping,
    lastEdit,
    editLock,
    startTyping,
    stopTyping,
    updateCursor,
    detectConflict,
    resolveConflict,
    requestEditLock,
    releaseEditLock
  };
}

// Hook for cross-tab synchronization
export function useCrossTabSync(dataKey) {
  const [lastSync, setLastSync] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState('synced');

  useEffect(() => {
    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e) => {
      if (e.key === `cms-sync-${dataKey}`) {
        setSyncStatus('syncing');
        
        try {
          const syncData = JSON.parse(e.newValue || '{}');
          
          // Notify subscribers about cross-tab change
          webSocketService.notifySubscribers('cross-tab-sync', {
            dataKey,
            data: syncData,
            timestamp: new Date()
          });
          
          setTimeout(() => {
            setSyncStatus('synced');
            setLastSync(new Date());
          }, 500);
        } catch (error) {
          console.error('Error parsing cross-tab sync data:', error);
          setSyncStatus('error');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dataKey]);

  const broadcastChange = useCallback((data) => {
    try {
      localStorage.setItem(`cms-sync-${dataKey}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        tabId: sessionStorage.getItem('tabId') || Math.random().toString(36)
      }));
    } catch (error) {
      console.error('Error broadcasting cross-tab change:', error);
    }
  }, [dataKey]);

  return {
    lastSync,
    syncStatus,
    broadcastChange
  };
}

// Hook for live event streaming
export function useLiveEventStream(eventTypes = []) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = webSocketService.subscribe('live-event', (event) => {
      if (eventTypes.length === 0 || eventTypes.includes(event.type)) {
        setEvents(prev => [
          {
            id: Date.now() + Math.random(),
            ...event
          },
          ...prev.slice(0, 99) // Keep last 100 events
        ]);
      }
    });

    const unsubscribeConnection = webSocketService.subscribe('connection', (connectionData) => {
      setIsConnected(connectionData.status === 'connected');
    });

    return () => {
      unsubscribe();
      unsubscribeConnection();
    };
  }, [eventTypes]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    clearEvents
  };
}