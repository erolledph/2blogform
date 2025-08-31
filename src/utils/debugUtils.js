// Consolidated debugging utilities for production
export const debugUtils = {
  // Simple image validation for production
  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return {
        valid: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type')
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  },

  // Basic upload validation
  validateUploadPath(userId, targetPath) {
    if (!targetPath.startsWith(`users/${userId}/`)) {
      throw new Error('Invalid upload path');
    }
    
    if (targetPath.includes('..') || targetPath.includes('//')) {
      throw new Error('Invalid path: contains suspicious patterns');
    }
    
    return true;
  },

  // Simple error categorization
  categorizeError(error) {
    if (error.code?.includes('permission') || error.message?.includes('Permission')) {
      return 'permission';
    }
    if (error.code?.includes('network') || error.message?.includes('network')) {
      return 'network';
    }
    if (error.code?.includes('quota') || error.message?.includes('quota')) {
      return 'quota';
    }
    return 'unknown';
  },

  // Log error with context
  logError(context, error, additionalData = {}) {
    console.error(`[${context}] Error:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ...additionalData
    });
  }
};

export default debugUtils;