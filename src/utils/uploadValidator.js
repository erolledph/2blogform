// Upload validation utilities
import { auth } from '@/firebase';
import { storageService } from '@/services/storageService';

export const uploadValidator = {
  // Validate user can upload to specific path
  async validateUploadPath(userId, targetPath) {
    console.log('Validating upload path:', { userId, targetPath });
    
    // Check authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    if (currentUser.uid !== userId) {
      throw new Error('User ID mismatch - security violation');
    }
    
    // Validate path format
    const expectedBasePath = `users/${userId}/`;
    if (!targetPath.startsWith(expectedBasePath)) {
      throw new Error(`Invalid path: must start with ${expectedBasePath}`);
    }
    
    // Check for path traversal attempts
    if (targetPath.includes('..') || targetPath.includes('//')) {
      throw new Error('Invalid path: contains suspicious patterns');
    }
    
    return true;
  },
  
  // Validate file before upload
  async validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxDimensions = { width: 4000, height: 4000 }
    } = options;
    
    console.log('Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // File type validation
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // File size validation
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${maxSize} bytes`);
    }
    
    // Image dimension validation
    if (file.type.startsWith('image/')) {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
        throw new Error(`Image dimensions ${dimensions.width}x${dimensions.height} exceed maximum ${maxDimensions.width}x${maxDimensions.height}`);
      }
    }
    
    return true;
  },
  
  // Get image dimensions
  async getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for dimension check'));
      };
      
      img.src = url;
    });
  },
  
  // Validate storage quota
  async validateStorageQuota(userId, fileSize) {
    try {
      const canUpload = await storageService.canUserUploadFile(
        userId,
        fileSize,
        // Get user's storage limit from auth context or default
        100 // This should come from user settings
      );
      
      if (!canUpload.canUpload) {
        throw new Error(`Storage quota exceeded: ${canUpload.reason}`);
      }
      
      return canUpload;
    } catch (error) {
      console.error('Storage quota validation failed:', error);
      // Allow upload on validation error to avoid blocking users
      return { canUpload: true, warning: 'Could not validate storage quota' };
    }
  },
  
  // Comprehensive pre-upload validation
  async validateUpload(userId, file, targetPath, options = {}) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      // Validate authentication and path
      await this.validateUploadPath(userId, targetPath);
      
      // Validate file
      await this.validateFile(file, options);
      
      // Validate storage quota
      const quotaResult = await this.validateStorageQuota(userId, file.size);
      if (!quotaResult.canUpload) {
        validationResults.errors.push(quotaResult.reason);
        validationResults.isValid = false;
      }
      if (quotaResult.warning) {
        validationResults.warnings.push(quotaResult.warning);
      }
      
    } catch (error) {
      validationResults.errors.push(error.message);
      validationResults.isValid = false;
    }
    
    return validationResults;
  }
};

// Export for use in components
export default uploadValidator;