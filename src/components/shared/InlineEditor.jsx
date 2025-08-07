import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Edit } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

// Inline editor for quick field updates
export default function InlineEditor({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  disabled = false,
  validation = null,
  formatDisplay = null
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { executeOperation } = useRealTimeOperations();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    // Validate if validation function provided
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      
      await onSave(editValue);
      toast.success('Updated successfully');
      
      setIsEditing(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : value;

  if (isEditing) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {type === 'textarea' ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="input-field text-sm min-w-32"
            rows={2}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleSave}
            className="input-field text-sm min-w-32"
            placeholder={placeholder}
          />
        )}
        
        <div className="flex items-center space-x-1">
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        
        {error && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center space-x-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 transition-colors group ${className}`}
      onClick={handleEdit}
    >
      <span className="text-sm">
        {displayValue || placeholder}
      </span>
      <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Status toggle component for quick status changes
export function StatusToggle({ 
  status, 
  onToggle, 
  disabled = false,
  statuses = ['draft', 'published']
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (disabled || toggling) return;
    
    const newStatus = status === 'published' ? 'draft' : 'published';
    
    try {
      setToggling(true);
      
      await onToggle(newStatus);
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setToggling(false);
    }
  };

  const getStatusConfig = (currentStatus) => {
    switch (currentStatus) {
      case 'published':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          hoverColor: 'hover:bg-green-100'
        };
      case 'draft':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          hoverColor: 'hover:bg-amber-100'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          hoverColor: 'hover:bg-gray-100'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || toggling}
      className={`
        inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium
        transition-all duration-200 ${config.bgColor} ${config.borderColor} ${config.color}
        ${disabled ? 'opacity-50 cursor-not-allowed' : `${config.hoverColor} cursor-pointer`}
      `}
    >
      {toggling ? (
        <LoadingSpinner size="sm" />
      ) : (
        <span>{status}</span>
      )}
    </button>
  );
}