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

      // Calculate storage from user's public images
      const publicImagesUsage = await this.calculatePathStorageUsage(`users/${userId}/public_images`);
      
      // Calculate storage from user's private files (if any)
      const privateFilesUsage = await this.calculatePathStorageUsage(`users/${userId}/private`);
      
      // Calculate storage from legacy images folder (for backward compatibility)
      // Note: This is a simplified approach - in a real implementation, you might want to
      // track which legacy files belong to which user
      const legacyImagesUsage = await this.calculateLegacyImagesUsage(userId);
      
      const totalUsage = publicImagesUsage + privateFilesUsage + legacyImagesUsage;
      
      console.log(`Storage usage for user ${userId}:`, {
        publicImages: publicImagesUsage,
        privateFiles: privateFilesUsage,
        legacyImages: legacyImagesUsage,
        total: totalUsage
      });
      
      return totalUsage;
    } catch (error) {
      console.error('Error calculating user storage usage:', error);
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
      const storageRef = ref(storage, path);
      return await this.calculateStorageRecursive(storageRef);
    } catch (error) {
      console.error(`Error calculating storage for path ${path}:`, error);
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
      const result = await listAll(storageRef);
      let totalSize = 0;
      
      // Calculate size of files at current level
      const filePromises = result.items.map(async (itemRef) => {
        try {
          const metadata = await getMetadata(itemRef);
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
      console.error(`Error in calculateStorageRecursive for ${storageRef.fullPath}:`, error);
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
      const stats = await this.getUserStorageStats(userId, limitMB);
      const canUpload = stats.remainingBytes >= fileSizeBytes;
      
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
      // Allow upload on error to avoid blocking users
      return {
        canUpload: true,
        reason: null,
        error: error.message
      };
    }

  },
  /**
   * Copy a file from source to destination using server-side function
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async copyFile(sourcePath, destPath, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operation: 'copyFile',
          sourcePath,
          destPath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error copying file from ${sourcePath} to ${destPath}:`, error);
      throw error;
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
   * Delete a file using server-side function
   * @param {string} filePath - File path to delete
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async deleteFile(filePath, authToken) {
    try {
      const response = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          filePath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      throw error;
    }
  },

  /**
   * Recursively delete all contents of a folder
   * @param {StorageReference} folderRef - Folder reference to delete
   * @returns {Promise<void>}
   */
  async deleteFolderRecursive(folderRef) {
    try {
      const result = await listAll(folderRef);
      
      // Delete all files in the folder
      const deleteFilePromises = result.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deleteFilePromises);
      
      // Recursively delete subfolders
      const deleteSubfolderPromises = result.prefixes.map(prefixRef => 
        this.deleteFolderRecursive(prefixRef)
      );
      await Promise.all(deleteSubfolderPromises);
    } catch (error) {
      console.error(`Error deleting folder ${folderRef.fullPath}:`, error);
      throw error;
    }
  },

  /**
   * Recursively move a folder and all its contents using server-side operations
   * @param {string} sourcePath - Source folder path
   * @param {string} destPath - Destination folder path
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async moveFolderRecursive(sourcePath, destPath, authToken) {
    try {
      const sourceRef = ref(storage, sourcePath);
      const result = await listAll(sourceRef);
      
      // Move all files in the folder
      const moveFilePromises = result.items.map(async (itemRef) => {
        const fileName = itemRef.name;
        const destFilePath = `${destPath}/${fileName}`;
        
        try {
          await this.moveFile(itemRef.fullPath, destFilePath, authToken);
        } catch (error) {
          console.error(`Error moving file ${itemRef.fullPath}:`, error);
          throw error;
        }
      });
      
      await Promise.all(moveFilePromises);
      
      // Recursively move subfolders
      const moveSubfolderPromises = result.prefixes.map(async (prefixRef) => {
        const subfolderName = prefixRef.name;
        const destSubfolderPath = `${destPath}/${subfolderName}`;
        
        try {
          await this.moveFolderRecursive(prefixRef.fullPath, destSubfolderPath, authToken);
        } catch (error) {
          console.error(`Error moving subfolder ${prefixRef.fullPath}:`, error);
          throw error;
        }
      });
      
      await Promise.all(moveSubfolderPromises);
    } catch (error) {
      console.error(`Error moving folder from ${sourcePath} to ${destPath}:`, error);
      throw error;
    }
  },

  /**
   * Rename a folder by moving it to a new location
   * @param {string} folderPath - Current folder path
   * @param {string} newName - New folder name
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async renameFolder(folderPath, newName, authToken) {
    try {
      // Validate new name
      if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
        throw new Error('Folder name can only contain letters, numbers, underscores, and hyphens');
      }
      
      // Calculate new path
      const pathParts = folderPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      
      // Check if destination already exists
      try {
        const destRef = ref(storage, newPath);
        const destResult = await listAll(destRef);
        if (destResult.items.length > 0 || destResult.prefixes.length > 0) {
          throw new Error('A folder with this name already exists');
        }
      } catch (error) {
        // If listAll fails, the folder doesn't exist, which is what we want
        if (!error.message.includes('already exists')) {
          // Continue with the rename operation
        } else {
          throw error;
        }
      }
      
      // Move the folder
      await this.moveFolderRecursive(folderPath, newPath, authToken);
    } catch (error) {
      console.error(`Error renaming folder ${folderPath} to ${newName}:`, error);
      throw error;
    }
  },

  /**
   * Move a folder to a new parent directory
   * @param {string} folderPath - Current folder path
   * @param {string} newParentPath - New parent directory path
   * @param {string} authToken - Authentication token
   * @returns {Promise<void>}
   */
  async moveFolder(folderPath, newParentPath, authToken) {
    try {
      // Get folder name from current path
      const folderName = folderPath.split('/').pop();
      const newPath = `${newParentPath}/${folderName}`;
      
      // Prevent moving to itself or a subdirectory
      if (newPath === folderPath) {
        throw new Error('Cannot move folder to the same location');
      }
      
      if (newPath.startsWith(folderPath + '/')) {
        throw new Error('Cannot move folder into its own subdirectory');
      }
      
      // Check if destination already exists
      try {
        const destRef = ref(storage, newPath);
        const destResult = await listAll(destRef);
        if (destResult.items.length > 0 || destResult.prefixes.length > 0) {
          throw new Error('A folder with this name already exists in the destination');
        }
      } catch (error) {
        // If listAll fails, the folder doesn't exist, which is what we want
        if (!error.message.includes('already exists')) {
          // Continue with the move operation
        } else {
          throw error;
        }
      }
      
      // Move the folder
      await this.moveFolderRecursive(folderPath, newPath, authToken);
    } catch (error) {
      console.error(`Error moving folder ${folderPath} to ${newParentPath}:`, error);
      throw error;
    }
  }
};