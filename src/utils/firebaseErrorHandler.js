// Firebase error handling utilities
export const firebaseErrorHandler = {
  // Handle Firebase Storage errors
  handleStorageError(error) {
    console.error('Firebase Storage Error:', error);
    
    const errorDetails = {
      code: error.code,
      message: error.message,
      serverResponse: error.serverResponse,
      customData: error.customData
    };
    
    console.error('Storage error details:', errorDetails);
    
    switch (error.code) {
      case 'storage/unauthorized':
        return {
          userMessage: 'Permission denied. Please check your authentication and try logging out and back in.',
          technical: 'User does not have permission to access the storage path',
          action: 'CHECK_AUTH'
        };
        
      case 'storage/quota-exceeded':
        return {
          userMessage: 'Storage quota exceeded. Please contact an administrator to increase your storage limit.',
          technical: 'Storage quota has been exceeded',
          action: 'CONTACT_ADMIN'
        };
        
      case 'storage/invalid-format':
        return {
          userMessage: 'Invalid file format. Please select a valid image file.',
          technical: 'File format is not supported',
          action: 'SELECT_DIFFERENT_FILE'
        };
        
      case 'storage/object-not-found':
        return {
          userMessage: 'Storage path not found. Please try again.',
          technical: 'The specified storage path does not exist',
          action: 'RETRY'
        };
        
      case 'storage/bucket-not-found':
        return {
          userMessage: 'Storage configuration error. Please contact support.',
          technical: 'Firebase Storage bucket not found',
          action: 'CONTACT_SUPPORT'
        };
        
      case 'storage/project-not-found':
        return {
          userMessage: 'Project configuration error. Please contact support.',
          technical: 'Firebase project not found',
          action: 'CONTACT_SUPPORT'
        };
        
      case 'storage/retry-limit-exceeded':
        return {
          userMessage: 'Upload failed after multiple attempts. Please try again later.',
          technical: 'Retry limit exceeded',
          action: 'RETRY_LATER'
        };
        
      case 'storage/invalid-checksum':
        return {
          userMessage: 'File upload was corrupted. Please try again.',
          technical: 'File checksum validation failed',
          action: 'RETRY'
        };
        
      case 'storage/canceled':
        return {
          userMessage: 'Upload was canceled.',
          technical: 'Upload operation was canceled',
          action: 'RETRY'
        };
        
      case 'storage/invalid-event-name':
        return {
          userMessage: 'Upload configuration error. Please contact support.',
          technical: 'Invalid event name in upload operation',
          action: 'CONTACT_SUPPORT'
        };
        
      case 'storage/invalid-url':
        return {
          userMessage: 'Invalid storage URL. Please contact support.',
          technical: 'Storage URL is malformed',
          action: 'CONTACT_SUPPORT'
        };
        
      case 'storage/no-default-bucket':
        return {
          userMessage: 'Storage not configured. Please contact support.',
          technical: 'No default storage bucket configured',
          action: 'CONTACT_SUPPORT'
        };
        
      case 'storage/cannot-slice-blob':
        return {
          userMessage: 'File processing error. Please try a different file.',
          technical: 'Cannot slice the file blob',
          action: 'SELECT_DIFFERENT_FILE'
        };
        
      case 'storage/server-file-wrong-size':
        return {
          userMessage: 'File size mismatch. Please try uploading again.',
          technical: 'Server reported different file size than expected',
          action: 'RETRY'
        };
        
      case 'storage/unknown':
        return {
          userMessage: 'An unknown storage error occurred. Please try again.',
          technical: 'Unknown storage error',
          action: 'RETRY'
        };
        
      case 'storage/network-error':
        return {
          userMessage: 'Network error during upload. Please check your connection and try again.',
          technical: 'Network connectivity issue',
          action: 'RETRY'
        };
        
      default:
        return {
          userMessage: error.message.includes('Permission denied') 
            ? 'Permission denied. Please check your authentication and try logging out and back in.'
            : `Upload failed: ${error.message}`,
          technical: error.message,
          action: error.message.includes('Permission denied') ? 'CHECK_AUTH' : 'RETRY'
        };
    }
  },
  
  // Handle Firebase Auth errors
  handleAuthError(error) {
    console.error('Firebase Auth Error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return error.message;
    }
  },
  
  // Handle Firebase Admin SDK errors (for server-side operations)
  handleAdminError(error) {
    console.error('Firebase Admin Error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        return {
          userMessage: 'User account not found. It may have already been deleted.',
          technical: 'User does not exist in Firebase Authentication',
          action: 'VERIFY_USER_EXISTS'
        };
        
      case 'auth/insufficient-permission':
        return {
          userMessage: 'Insufficient permissions to perform this operation. Check admin configuration.',
          technical: 'Firebase Admin SDK lacks required permissions',
          action: 'CHECK_ADMIN_CONFIG'
        };
        
      case 'auth/project-not-found':
        return {
          userMessage: 'Project configuration error. Contact system administrator.',
          technical: 'Firebase project not found or misconfigured',
          action: 'CHECK_PROJECT_CONFIG'
        };
        
      case 'permission-denied':
        return {
          userMessage: 'Permission denied. Check your admin privileges and try again.',
          technical: 'Firestore security rules denied the operation',
          action: 'CHECK_PERMISSIONS'
        };
        
      case 'unavailable':
        return {
          userMessage: 'Service temporarily unavailable. Please try again in a few moments.',
          technical: 'Firebase service is temporarily unavailable',
          action: 'RETRY_LATER'
        };
        
      case 'deadline-exceeded':
        return {
          userMessage: 'Operation timed out. Large datasets may require multiple attempts.',
          technical: 'Operation exceeded time limit',
          action: 'RETRY_WITH_SMALLER_BATCHES'
        };
        
      case 'resource-exhausted':
        return {
          userMessage: 'Rate limit exceeded. Please wait a moment and try again.',
          technical: 'Firebase quota or rate limit exceeded',
          action: 'WAIT_AND_RETRY'
        };
        
      default:
        return {
          userMessage: error.message || 'An unexpected error occurred during the operation.',
          technical: error.message,
          action: 'CHECK_LOGS'
        };
    }
  },
  
  // Handle Firestore errors
  handleFirestoreError(error) {
    console.error('Firestore Error:', error);
    
    switch (error.code) {
      case 'permission-denied':
        return 'Permission denied. Please check your authentication';
      case 'not-found':
        return 'Document not found';
      case 'already-exists':
        return 'Document already exists';
      case 'resource-exhausted':
        return 'Quota exceeded. Please try again later';
      case 'failed-precondition':
        return 'Operation failed due to precondition';
      case 'aborted':
        return 'Operation was aborted';
      case 'out-of-range':
        return 'Operation out of range';
      case 'unimplemented':
        return 'Operation not implemented';
      case 'internal':
        return 'Internal server error';
      case 'unavailable':
        return 'Service temporarily unavailable';
      case 'data-loss':
        return 'Data loss detected';
      case 'unauthenticated':
        return 'User not authenticated';
      default:
        return error.message;
    }
  }
};

// Export for use in components
export default firebaseErrorHandler;