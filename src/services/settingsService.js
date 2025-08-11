import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export const settingsService = {
  // Get public custom domain setting for a specific user
  async getPublicCustomDomain(userId) {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'public');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.customDomain || '';
      }
      
      return '';
    } catch (error) {
      console.error('Error fetching custom domain:', error);
      return '';
    }
  },

  // Set public custom domain setting for a specific user
  async setPublicCustomDomain(userId, domain) {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'public');
      await setDoc(docRef, {
        customDomain: domain || '',
        updatedAt: new Date()
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error saving custom domain:', error);
      throw error;
    }
  },

  // Get public application settings for a specific user
  async getPublicAppSettings(userId) {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'public');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      // Return default settings if no public settings exist
      return {
        currency: '$', // Default currency
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching public app settings:', error);
      return {
        currency: '$', // Default currency on error
        updatedAt: new Date()
      };
    }
  },

  // Set public application settings for a specific user
  async setPublicAppSettings(userId, settings) {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'public');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error saving public app settings:', error);
      throw error;
    }
  },

  // Get user-specific settings
  async getUserSettings(userId) {
    try {
      const docRef = doc(db, 'users', userId, 'userSettings', 'preferences');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      // Return default settings if no user settings exist
      return {
        currency: '$', // Default currency
        role: 'user', // Default role
        canManageMultipleBlogs: false, // Default multi-blog permission
        maxBlogs: 1, // Default blog limit
        totalStorageMB: 100, // Default storage limit in MB
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return {
        currency: '$', // Default currency on error
        role: 'user', // Default role on error
        canManageMultipleBlogs: false, // Default multi-blog permission on error
        maxBlogs: 1, // Default blog limit on error
        totalStorageMB: 100, // Default storage limit on error
        updatedAt: new Date()
      };
    }
  },

  // Set user-specific settings
  async setUserSettings(userId, settings) {
    try {
      const docRef = doc(db, 'users', userId, 'userSettings', 'preferences');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }
};