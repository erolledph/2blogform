import React, { useState, useEffect } from 'react';
import { Users, Eye, Edit, MousePointer, Activity } from 'lucide-react';
import { useCollaboration } from '@/services/webSocketService';
import DynamicTransition from './DynamicTransition';

// Real-time user presence indicators
export function PresenceIndicators({ location = 'dashboard', className = '' }) {
  const { collaborators, presenceData } = useCollaboration(location);
  const [showDetails, setShowDetails] = useState(false);

  const activeCollaborators = collaborators.filter(c => 
    c.location === location && c.isActive !== false
  );

  if (activeCollaborators.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex -space-x-2">
          {activeCollaborators.slice(0, 3).map((collaborator) => (
            <div
              key={collaborator.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm"
              style={{ backgroundColor: collaborator.color }}
              title={collaborator.name}
            >
              {collaborator.name.charAt(0)}
            </div>
          ))}
          {activeCollaborators.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-medium shadow-sm">
              +{activeCollaborators.length - 3}
            </div>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {activeCollaborators.length} active
        </span>
      </div>

      {/* Detailed presence panel */}
      {showDetails && (
        <DynamicTransition show={showDetails} transitionType="scale">
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-border rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Active Users
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {activeCollaborators.map((collaborator) => (
                <div key={collaborator.id} className="p-3 border-b border-border last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {collaborator.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {collaborator.location.replace('-', ' ')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {collaborator.isTyping && (
                        <Edit className="h-3 w-3 text-blue-500 animate-pulse" />
                      )}
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DynamicTransition>
      )}
    </div>
  );
}

// Collaborative cursor component
export function CollaborativeCursors({ collaborators = [], className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none z-40 ${className}`}>
      {collaborators.map((collaborator) => (
        <div
          key={collaborator.id}
          className="absolute transition-all duration-200 ease-out"
          style={{
            left: collaborator.cursor?.x || 0,
            top: collaborator.cursor?.y || 0,
            color: collaborator.color
          }}
        >
          <div className="relative">
            <MousePointer className="h-4 w-4" style={{ color: collaborator.color }} />
            <div 
              className="absolute top-5 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Live editing conflict resolution component
export function ConflictResolutionModal({ 
  isOpen, 
  onClose, 
  localData, 
  serverData, 
  onResolve 
}) {
  const [selectedVersion, setSelectedVersion] = useState('local');

  const handleResolve = () => {
    const resolvedData = selectedVersion === 'local' ? localData : serverData;
    onResolve(resolvedData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editing Conflict Detected" size="lg">
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-1">Conflict Detected</h3>
              <p className="text-sm text-amber-700">
                This content has been modified by another user while you were editing. 
                Please choose which version to keep.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local version */}
          <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedVersion === 'local' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-border hover:border-blue-300'
          }`} onClick={() => setSelectedVersion('local')}>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="radio"
                checked={selectedVersion === 'local'}
                onChange={() => setSelectedVersion('local')}
                className="w-4 h-4 text-blue-600"
              />
              <h4 className="font-medium text-foreground">Your Version</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Title:</strong> {localData?.title || 'Untitled'}</div>
              <div><strong>Last Modified:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Content Length:</strong> {localData?.content?.length || 0} characters</div>
            </div>
          </div>

          {/* Server version */}
          <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedVersion === 'server' 
              ? 'border-green-500 bg-green-50' 
              : 'border-border hover:border-green-300'
          }`} onClick={() => setSelectedVersion('server')}>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="radio"
                checked={selectedVersion === 'server'}
                onChange={() => setSelectedVersion('server')}
                className="w-4 h-4 text-green-600"
              />
              <h4 className="font-medium text-foreground">Server Version</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Title:</strong> {serverData?.title || 'Untitled'}</div>
              <div><strong>Last Modified:</strong> {serverData?.updatedAt ? new Date(serverData.updatedAt).toLocaleString() : 'Unknown'}</div>
              <div><strong>Content Length:</strong> {serverData?.content?.length || 0} characters</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleResolve} className="btn-primary">
            Use {selectedVersion === 'local' ? 'My' : 'Server'} Version
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Cross-tab sync indicator
export function CrossTabSyncIndicator({ className = '' }) {
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    // Listen for cross-tab sync events
    const handleStorageChange = (e) => {
      if (e.key === 'cms-cross-tab-sync') {
        setSyncStatus('syncing');
        setTimeout(() => {
          setSyncStatus('synced');
          setLastSync(new Date());
        }, 500);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Synced'
        };
      case 'syncing':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Syncing...'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} style={{ backgroundColor: config.color.replace('text-', '') }}></div>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
      <span className="text-xs text-muted-foreground">
        {lastSync.toLocaleTimeString()}
      </span>
    </div>
  );
}