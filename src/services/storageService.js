import { ref, listAll, getMetadata } from 'firebase/storage';
import { storage } from '@/firebase';

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
  }
};