// Utility functions

export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

export const parseArrayInput = (value) => {
  return value.split(',').map(item => item.trim()).filter(item => item);
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  if (date.toDate) {
    return date.toDate().toLocaleDateString();
  }
  
  return new Date(date).toLocaleDateString();
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'published':
      return 'badge-success';
    case 'draft':
      return 'badge-warning';
    default:
      return 'badge-secondary';
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Enhanced debounce with immediate option
export const debounceAdvanced = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for performance-critical operations
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate unique IDs for operations
export const generateOperationId = (prefix = 'op') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format time ago
export const timeAgo = (date) => {
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Deep clone utility
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Retry with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Enhanced API call wrapper with retry logic and better error handling
export const apiCallWithRetry = async (url, options = {}, maxRetries = 3) => {
  const { retryOn = ['network', 'timeout', '5xx'], ...fetchOptions } = options;
  
  return retryWithBackoff(async () => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      // Check if we should retry based on status code
      if (!response.ok) {
        const shouldRetry = retryOn.includes('5xx') && response.status >= 500;
        
        if (shouldRetry) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // For non-retryable errors, parse the response and throw with details
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If we can't parse the error response, use status text
        }
        
        const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.details = errorData;
        throw error;
      }
      
      return response;
    } catch (error) {
      // Check if this is a network error that should be retried
      const isNetworkError = error.name === 'TypeError' || 
                            error.message.includes('Failed to fetch') ||
                            error.message.includes('Network request failed') ||
                            error.message.includes('timeout');
      
      if (retryOn.includes('network') && isNetworkError) {
        console.warn('Network error detected, will retry:', error.message);
        throw error; // This will trigger the retry logic
      }
      
      // For non-retryable errors, throw immediately
      throw error;
    }
  }, maxRetries, 1000);
};

// Optimistic update helper
export const createOptimisticUpdate = (operation, optimisticData, rollbackData) => {
  return {
    id: generateOperationId('optimistic'),
    operation,
    optimisticData,
    rollbackData,
    timestamp: Date.now(),
    applied: false
  };
};

// Enhanced error categorization
export const categorizeError = (error) => {
  if (!error) return 'unknown';
  
  const message = error.message || '';
  const code = error.code || '';
  const status = error.status;
  
  // Network errors
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('timeout') ||
      error.name === 'TypeError') {
    return 'network';
  }
  
  // Authentication errors
  if (status === 401 || code.includes('auth/')) {
    return 'authentication';
  }
  
  // Permission errors
  if (status === 403 || message.includes('permission') || message.includes('Forbidden')) {
    return 'permission';
  }
  
  // Validation errors
  if (status === 400 || message.includes('validation') || message.includes('Invalid')) {
    return 'validation';
  }
  
  // Server errors
  if (status >= 500) {
    return 'server';
  }
  
  // Client errors
  if (status >= 400 && status < 500) {
    return 'client';
  }
  
  return 'unknown';
};

// User-friendly error messages
export const getUserFriendlyErrorMessage = (error) => {
  const category = categorizeError(error);
  const status = error.status;
  
  switch (category) {
    case 'network':
      return 'Network connection issue. Please check your internet connection and try again.';
    case 'authentication':
      return 'Authentication expired. Please log out and log back in.';
    case 'permission':
      return 'You do not have permission to perform this action.';
    case 'validation':
      return error.message || 'Invalid data provided. Please check your input.';
    case 'server':
      return 'Server error occurred. Please try again in a moment.';
    case 'client':
      if (status === 404) {
        return 'The requested resource was not found.';
      }
      return error.message || 'Request failed. Please check your input and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Check if object has changed
export const hasObjectChanged = (obj1, obj2, ignoreKeys = []) => {
  const keys1 = Object.keys(obj1).filter(key => !ignoreKeys.includes(key));
  const keys2 = Object.keys(obj2).filter(key => !ignoreKeys.includes(key));
  
  if (keys1.length !== keys2.length) return true;
  
  for (const key of keys1) {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      return true;
    }
  }
  
  return false;
};