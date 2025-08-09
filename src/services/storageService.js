import { ref, listAll, getMetadata, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';

export const storageService = {
  /**
   * Calculate total storage usage for a specific user
   * @param {string} userId - The user's UID
   * @returns {Promise<number>} Total storage usage in bytes
   */
  async getUserTotalStorageUsage(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      console.log('Calculating storage usage for user:', userId);

      // Calculate storage from user's public images
      const publicImagesUsage = await this.calculatePathStorageUsage(`users/${userId}/public_images`);
      
      // Calculate storage from user's private files (if any)
      const privateFilesUsage = await this.calculatePathStorageUsage(`users/${userId}/private`);
      
      // Calculate storage from legacy images folder (for backward compatibility)
      // Note: This is a simplified approach - in a real implementation, you might want to
      // track which legacy files belong to which user
      const legacyImagesUsage = await this.calculateLegacyImagesUsage(userId);
      
      const totalUsage = publicImagesUsage + privateFilesUsage + legacyImagesUsage;
      
      console.log('Storage usage calculation completed:', {
        userId,
        publicImages: publicImagesUsage,
        privateFiles: privateFilesUsage,
        legacyImages: legacyImagesUsage,
        total: totalUsage
      });
      
      return totalUsage;
    } catch (error) {
      console.error('Error calculating user storage usage:', error);
      console.error('Storage calculation error details:', {
        userId,
        error: error.message,
        code: error.code
      });
      // Return 0 on error to avoid blocking uploads, but log the error
      return 0;
    }
  },

  /**
   * Calculate storage usage for a specific path
   * @param {string} path - Storage path to calculate
   * @returns {Promise<number>} Storage usage in bytes
   */
  async calculatePathStorageUsage(path) {
    try {
      console.log('Calculating storage for path:', path);
      const storageRef = ref(storage, path);
      return await this.calculateStorageRecursive(storageRef);
    } catch (error) {
      console.error(`Error calculating storage for path ${path}:`, error);
      console.error('Path calculation error details:', {
        path,
        error: error.message,
        code: error.code
      });
      return 0;
    }
  },

  /**
   * Recursively calculate storage usage for a storage reference
   * @param {StorageReference} storageRef - Firebase storage reference
   * @returns {Promise<number>} Storage usage in bytes
   */
  async calculateStorageRecursive(storageRef) {
    try {
      console.log('Listing files in:', storageRef.fullPath);
      const result = await listAll(storageRef);
      let totalSize = 0;
      
      // Calculate size of files at current level
      const filePromises = result.items.map(async (itemRef) => {
        try {
          const metadata = await getMetadata(itemRef);
          console.log(`File: ${itemRef.name}, Size: ${metadata.size}, Path: ${itemRef.fullPath}`);
          return metadata.size || 0;
        } catch (error) {
          console.warn(`Error getting metadata for ${itemRef.fullPath}:`, error);
          return 0;
        }
      });
      
      const fileSizes = await Promise.all(filePromises);
      totalSize += fileSizes.reduce((sum, size) => sum + size, 0);
      
      // Recursively calculate size of subfolders
      const subfolderPromises = result.prefixes.map(async (prefixRef) => {
        try {
          return await this.calculateStorageRecursive(prefixRef);
        } catch (error) {
          console.warn(`Error calculating storage for subfolder ${prefixRef.fullPath}:`, error);
          return 0;
        }
      });
      
      const subfolderSizes = await Promise.all(subfolderPromises);
      totalSize += subfolderSizes.reduce((sum, size) => sum + size, 0);
      
      return totalSize;
    } catch (error) {
      console.error('Error in calculateStorageRecursive:', {
        path: storageRef.fullPath,
        error: error.message,
        code: error.code
      });
      return 0;
    }
  },

  /**
   * Calculate legacy images usage (simplified approach)
   * In a real implementation, you might want to track file ownership more precisely
   * @param {string} userId - The user's UID
   * @returns {Promise<number>} Legacy storage usage in bytes
   */
  async calculateLegacyImagesUsage(userId) {
    try {
      // For now, we'll return 0 for legacy images to avoid counting shared files
      // In a production system, you might want to:
      // 1. Migrate all legacy files to user-specific paths
      // 2. Add metadata to track file ownership
      // 3. Implement a more sophisticated tracking system
      return 0;
    } catch (error) {
      console.error('Error calculating legacy images usage:', error);
      return 0;
    }
  },

  /**
   * Get user's storage statistics
   * @param {string} userId - The user's UID
   * @param {number} limitMB - User's storage limit in MB
   * @returns {Promise<Object>} Storage statistics
   */
  async getUserStorageStats(userId, limitMB = 100) {
    try {
      const usedBytes = await this.getUserTotalStorageUsage(userId);
      const limitBytes = limitMB * 1024 * 1024;
      const usagePercentage = (usedBytes / limitBytes) * 100;
      
      return {
        usedBytes,
        limitBytes,
        limitMB,
        usagePercentage: Math.min(usagePercentage, 100),
        remainingBytes: Math.max(limitBytes - usedBytes, 0),
        isNearLimit: usagePercentage > 70,
        isAtLimit: usagePercentage > 90
      };
    } catch (error) {
      console.error('Error getting user storage stats:', error);
      return {
        usedBytes: 0,
        limitBytes: limitMB * 1024 * 1024,
        limitMB,
        usagePercentage: 0,
        remainingBytes: limitMB * 1024 * 1024,
        isNearLimit: false,
        isAtLimit: false
      };
    }
  },

  /**
   * Check if user can upload a file of given size
   * @param {string} userId - The user's UID
   * @param {number} fileSizeBytes - Size of file to upload in bytes
   * @param {number} limitMB - User's storage limit in MB
   * @returns {Promise<Object>} Upload permission result
   */
  async canUserUploadFile(userId, fileSizeBytes, limitMB = 100) {
    try {
      console.log('Checking upload permission:', {
        userId,
        fileSizeBytes,
        limitMB
      });
      
      const stats = await this.getUserStorageStats(userId, limitMB);
      const canUpload = stats.remainingBytes >= fileSizeBytes;
      
      console.log('Upload permission result:', {
        canUpload,
        currentUsage: stats.usedBytes,
        limit: stats.limitBytes,
        fileSize: fileSizeBytes,
        remaining: stats.remainingBytes
      });
      
      return {
        canUpload,
        reason: canUpload ? null : 'Storage limit exceeded',
        currentUsage: stats.usedBytes,
        limit: stats.limitBytes,
        fileSize: fileSizeBytes,
        wouldExceedBy: canUpload ? 0 : fileSizeBytes - stats.remainingBytes
      };
    } catch (error) {
      console.error('Error checking upload permission:', error);
      console.error('Upload permission error details:', {
        userId,
        fileSizeBytes,
        limitMB,
        error: error.message
      });
      
      // Enhanced error handling - be more strict about quota enforcement
      // Only allow upload if it's a non-critical error (like network timeout)
      const isNetworkError = error.message.includes('network') || 
                            error.message.includes('timeout') || 
                            error.message.includes('fetch');
      
      if (isNetworkError) {
        console.warn('Network error during quota check, allowing upload with warning');
        return {
          canUpload: true,
          reason: null,
          warning: 'Could not verify storage quota due to network error',
          currentUsage: 0,
          limit: limitMB * 1024 * 1024,
          fileSize: fileSizeBytes
        };
      }
      
      // For other errors, be conservative and deny upload
      console.error('Critical error during quota check, denying upload');
      return {
        canUpload: false,
        reason: 'Unable to verify storage quota - upload denied for safety',
        error: error.message,
        currentUsage: 0,
        limit: limitMB * 1024 * 1024,
        fileSize: fileSizeBytes
      };
    }

  },
  /**
   * Move a file from source to destination using server-side function
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async moveFile(sourcePath, destPath, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'moveFile',
          sourcePath,
          destPath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error moving file from ${sourcePath} to ${destPath}:`, error);
      throw error;
    }
  },

  /**
   * Move a folder to a new parent directory using server-side function
   * @param {string} folderPath - Current folder path
   * @param {string} newParentPath - New parent directory path
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async moveFolder(folderPath, newParentPath, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'moveFolder',
          sourcePath: folderPath,
          destPath: newParentPath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error moving folder from ${folderPath} to ${newParentPath}:`, error);
      throw error;
    }
  },

  /**
   * Rename a folder using server-side function
   * @param {string} folderPath - Current folder path
   * @param {string} newName - New folder name
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async renameFolder(folderPath, newName, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'renameFolder',
          sourcePath: folderPath,
          newName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error renaming folder ${folderPath} to ${newName}:`, error);
      throw error;
    }
  },

  /**
   * Rename a file using server-side function
   * @param {string} sourcePath - Source file path
   * @param {string} newName - New file name
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async renameFile(sourcePath, newName, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'renameFile',
          sourcePath,
          newName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error renaming file ${sourcePath} to ${newName}:`, error);
      throw error;
    }
  },

  /**
   * Create a folder using server-side function
   * @param {string} folderPath - Path where to create the folder
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async createFolder(folderPath, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'createFolder',
          destPath: folderPath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error creating folder ${folderPath}:`, error);
      throw error;
    }
  },

  /**
   * Delete a file or folder using server-side function
   * @param {string} filePath - File or folder path to delete
   * @param {boolean} isFolder - Whether the item is a folder
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async deleteFile(filePath, authToken, isFolder = false) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          filePath,
          isFolder
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting ${isFolder ? 'folder' : 'file'} ${filePath}:`, error);
      throw error;
    }
  }
};
