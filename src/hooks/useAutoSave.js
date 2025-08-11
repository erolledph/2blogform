import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '@/utils/helpers';

// Auto-save hook with real-time indicators
export function useAutoSave(data, saveFunction, options = {}) {
  const {
    delay = 2000,
    enabled = true,
    onSave = null,
    onError = null,
    showNotifications = true,
    maxRetries = 3
  } = options;

  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const saveTimeoutRef = useRef(null);
  const lastDataRef = useRef(null);

  // Debounced save function with retry logic
  const debouncedSave = useCallback(
    debounce(async (dataToSave) => {
      if (!enabled || !dataToSave) return;
      
      // Don't save if data hasn't changed
      if (JSON.stringify(dataToSave) === JSON.stringify(lastDataRef.current)) {
        return;
      }
      
      setAutoSaveStatus('saving');
      
      try {
        await saveFunction(dataToSave);
        setAutoSaveStatus('saved');
        setLastSaved(new Date());
        setRetryCount(0);
        lastDataRef.current = dataToSave;
        
        if (onSave) onSave();
        
        if (showNotifications) {
          console.log('Draft saved automatically');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setRetryCount(prev => prev + 1);
        
        if (retryCount < maxRetries) {
          setAutoSaveStatus('retrying');
          // Retry with exponential backoff
          setTimeout(() => {
            debouncedSave(dataToSave);
          }, Math.min(1000 * Math.pow(2, retryCount), 10000));
        } else {
          setAutoSaveStatus('error');
          if (onError) onError(error);
          
          console.error('Auto-save failed - please save manually');
        }
      }
    }, delay),
    [saveFunction, enabled, delay, onSave, onError, showNotifications, retryCount, maxRetries]
  );

  // Trigger auto-save when data changes
  useEffect(() => {
    if (data && enabled) {
      setAutoSaveStatus('pending');
      debouncedSave(data);
    }
  }, [data, debouncedSave, enabled]);

  // Force save function
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await debouncedSave(data);
  }, [data, debouncedSave]);

  // Manual save function
  const manualSave = useCallback(async () => {
    if (!data || !enabled) return;
    
    setAutoSaveStatus('saving');
    try {
      await saveFunction(data);
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      setRetryCount(0);
      lastDataRef.current = data;
      
      if (onSave) onSave();
      
      if (showNotifications) {
        console.log('Saved successfully');
      }
    } catch (error) {
      setAutoSaveStatus('error');
      if (onError) onError(error);
      
      console.error('Save failed');
      throw error;
    }
  }, [data, saveFunction, enabled, onSave, onError, showNotifications]);

  return {
    autoSaveStatus,
    lastSaved,
    forceSave,
    manualSave,
    retryCount
  };
}

// Hook for form auto-save with field-level tracking
export function useFormAutoSave(initialData, saveFunction, options = {}) {
  const [formData, setFormData] = useState(initialData);
  const [changedFields, setChangedFields] = useState(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const autoSave = useAutoSave(
    isDirty ? formData : null,
    saveFunction,
    options
  );

  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };
      
      // Track which fields have changed
      setChangedFields(prevFields => {
        const newFields = new Set(prevFields);
        if (JSON.stringify(newData[fieldName]) !== JSON.stringify(initialData[fieldName])) {
          newFields.add(fieldName);
        } else {
          newFields.delete(fieldName);
        }
        return newFields;
      });
      
      // Update dirty state
      setIsDirty(newFields.size > 0);
      
      return newData;
    });
  }, [initialData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setChangedFields(new Set());
    setIsDirty(false);
  }, [initialData]);

  return {
    formData,
    updateField,
    resetForm,
    changedFields: Array.from(changedFields),
    isDirty,
    ...autoSave
  };
}