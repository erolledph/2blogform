import React, { useState, useEffect, useRef } from 'react';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';
import { ConflictResolutionModal, CollaborativeCursors } from './CollaborationIndicators';
import SimpleMDE from 'react-simplemde-editor';
import { Edit, Users, Lock, AlertTriangle } from 'lucide-react';

// Enhanced editor with real-time collaboration
export default function CollaborativeEditor({
  value,
  onChange,
  contentId,
  onSave,
  options = {},
  className = ''
}) {
  const {
    collaborators,
    conflicts,
    isTyping,
    editLock,
    startTyping,
    stopTyping,
    updateCursor,
    detectConflict,
    resolveConflict,
    requestEditLock,
    releaseEditLock
  } = useRealTimeCollaboration(contentId, 'content-editor');

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentConflict, setCurrentConflict] = useState(null);
  const [localValue, setLocalValue] = useState(value);
  const editorRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    // Handle conflicts
    if (conflicts.length > 0) {
      const latestConflict = conflicts[conflicts.length - 1];
      setCurrentConflict(latestConflict);
      setShowConflictModal(true);
    }
  }, [conflicts]);

  const handleEditorChange = (newValue) => {
    setLocalValue(newValue);
    onChange(newValue);
    startTyping();
    
    // Simulate conflict detection
    if (Math.random() < 0.1) { // 10% chance of simulated conflict
      const simulatedServerData = {
        content: newValue + ' [Server Edit]',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Another User'
      };
      
      detectConflict(
        { content: newValue, updatedAt: new Date().toISOString() },
        simulatedServerData
      );
    }
  };

  const handleMouseMove = (e) => {
    if (editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      updateCursor(position);
    }
  };

  const handleConflictResolve = (resolvedData) => {
    if (currentConflict) {
      const resolution = resolveConflict(currentConflict.id, resolvedData);
      setLocalValue(resolution.content);
      onChange(resolution.content);
      setShowConflictModal(false);
      setCurrentConflict(null);
    }
  };

  const enhancedOptions = {
    ...options,
    spellChecker: false,
    placeholder: 'Write your content in Markdown...',
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', '|',
      'guide'
    ]
  };

  return (
    <div className={`relative ${className}`}>
      {/* Collaboration header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Edit className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Collaborative Editor</span>
          </div>
          
          {/* Typing indicators */}
          {collaborators.filter(c => c.isTyping).length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-1">
                {collaborators.filter(c => c.isTyping).slice(0, 3).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs animate-pulse"
                    style={{ backgroundColor: collaborator.color }}
                    title={`${collaborator.name} is typing`}
                  >
                    {collaborator.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground animate-pulse">
                {collaborators.filter(c => c.isTyping).length === 1 
                  ? `${collaborators.find(c => c.isTyping)?.name} is typing...`
                  : `${collaborators.filter(c => c.isTyping).length} users are typing...`
                }
              </span>
            </div>
          )}
        </div>

        {/* Active collaborators */}
        <div className="flex items-center space-x-2">
          {collaborators.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
              </span>
              <div className="flex -space-x-1">
                {collaborators.slice(0, 3).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: collaborator.color }}
                    title={collaborator.name}
                  >
                    {collaborator.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit lock indicator */}
      {editLock && (
        <DynamicTransition transitionType="slide-down">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Field locked for editing by {editLock.userId === webSocketService.userId ? 'you' : 'another user'}
              </span>
            </div>
          </div>
        </DynamicTransition>
      )}

      {/* Editor container with cursor tracking */}
      <div 
        ref={editorRef}
        className="relative"
        onMouseMove={handleMouseMove}
      >
        <SimpleMDE
          value={localValue}
          onChange={handleEditorChange}
          options={enhancedOptions}
        />
        
        {/* Collaborative cursors overlay */}
        <CollaborativeCursors collaborators={collaborators} />
      </div>

      {/* Conflict resolution modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        localData={currentConflict?.localData}
        serverData={currentConflict?.serverData}
        onResolve={handleConflictResolve}
      />
    </div>
  );
}

// Enhanced form field with collaboration features
export function CollaborativeFormField({
  label,
  value,
  onChange,
  fieldName,
  contentId,
  type = 'text',
  className = '',
  ...props
}) {
  const { editLock, requestEditLock, releaseEditLock } = useRealTimeCollaboration(contentId);
  const [isFocused, setIsFocused] = useState(false);
  const [hasLock, setHasLock] = useState(false);

  const handleFocus = async () => {
    setIsFocused(true);
    
    // Request edit lock for this field
    try {
      const lock = await requestEditLock(fieldName);
      setHasLock(true);
    } catch (error) {
      console.warn('Could not acquire edit lock:', error);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasLock(false);
    releaseEditLock();
  };

  const isLocked = editLock && editLock.fieldName === fieldName && editLock.userId !== webSocketService.userId;

  return (
    <div className={`relative ${className}`}>
      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-0 right-0 z-10 p-1">
          <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded text-xs text-amber-800">
            <Lock className="h-3 w-3" />
            <span>Locked</span>
          </div>
        </div>
      )}

      {/* Edit indicator */}
      {hasLock && isFocused && (
        <div className="absolute top-0 right-0 z-10 p-1">
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800">
            <Edit className="h-3 w-3" />
            <span>Editing</span>
          </div>
        </div>
      )}

      <label className="block text-base font-medium text-foreground mb-4">
        {label}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLocked}
          className={`input-field ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLocked}
          className={`input-field ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          {...props}
        />
      )}
    </div>
  );
}