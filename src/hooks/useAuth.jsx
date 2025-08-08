import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/firebase';
import { settingsService } from '@/services/settingsService';
import { useCache } from './useCache';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastNotificationCheck, setLastNotificationCheck] = useState(null);
  const cache = useCache();

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    // Clear cache on logout
    cache.clear();
    return signOut(auth);
  }

  async function getAuthToken() {
    if (currentUser) {
      return await getIdToken(currentUser, true);
    }
    return null;
  }

  // Check for admin notifications (when user settings are updated by admin)
  const checkForAdminNotifications = async (user, newProfile, previousProfile) => {
    if (!previousProfile || !newProfile) return;
    
    const maxBlogsChanged = previousProfile.maxBlogs !== newProfile.maxBlogs;
    const storageChanged = previousProfile.totalStorageMB !== newProfile.totalStorageMB;
    
    if (maxBlogsChanged || storageChanged) {
      // Only show notification if this is not the initial load
      if (lastNotificationCheck && Date.now() - lastNotificationCheck > 5000) {
        let message = "Congratulations! ";
        const updates = [];
        
        if (maxBlogsChanged) {
          updates.push(`${newProfile.maxBlogs} blog${newProfile.maxBlogs > 1 ? 's' : ''}`);
        }
        
        if (storageChanged) {
          updates.push(`${newProfile.totalStorageMB} MB storage`);
        }
        
        if (updates.length === 2) {
          message += `You have been granted ${updates[0]} and ${updates[1]}!`;
        } else {
          message += `You have been granted ${updates[0]}!`;
        }
        
        toast.success(message, {
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }
        });
      }
    }
    
    setLastNotificationCheck(Date.now());
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('Auth state changed - User authenticated:', {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified
        });
        
        try {
          // Fetch user settings to get role and multi-blog permissions
          const userSettings = await settingsService.getUserSettings(user.uid);
          
          const newProfile = {
            role: userSettings.role || 'user',
            canManageMultipleBlogs: userSettings.canManageMultipleBlogs || false,
            currency: userSettings.currency || '$',
            maxBlogs: userSettings.maxBlogs || 1,
            totalStorageMB: userSettings.totalStorageMB || 100
          };
          
          // Check for admin notifications before updating profile
          await checkForAdminNotifications(user, newProfile, userProfile);
          
          // Ensure user has a default blog when they first log in
          if (!userProfile) {
            try {
              await import('@/services/blogService').then(({ blogService }) => 
                blogService.ensureDefaultBlog(user.uid)
              );
            } catch (blogError) {
              console.warn('Could not ensure default blog during auth:', blogError);
            }
          }
          
          // Store raw Firebase user and separate profile data
          setCurrentUser(user);
          setUserProfile(newProfile);
        } catch (error) {
          console.error('Error fetching user settings:', error);
          console.error('Auth error details:', {
            uid: user.uid,
            error: error.message
          });
          // Set user and default profile if fetch fails
          setCurrentUser(user);
          setUserProfile({
            role: 'user',
            canManageMultipleBlogs: false,
            currency: '$',
            maxBlogs: 1,
            totalStorageMB: 100
          });
        }
      } else {
        console.log('Auth state changed - User logged out');
        setCurrentUser(null);
        setUserProfile(null);
        setLastNotificationCheck(null);
        // Clear cache when user logs out
        cache.clear();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Function to invalidate user settings cache (call when settings are updated)
  const invalidateUserSettingsCache = (uid) => {
    const cacheKey = `user-settings-${uid}`;
    cache.delete(cacheKey);
  };

  // Cached user settings fetch
  const fetchUserSettingsWithCache = async (uid) => {
    const cacheKey = `user-settings-${uid}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    // Fetch fresh data
    const userSettings = await settingsService.getUserSettings(uid);
    
    // Cache for 2 minutes (settings don't change frequently)
    cache.set(cacheKey, userSettings, 2 * 60 * 1000);
    
    return userSettings;
  };

  const value = {
    currentUser: currentUser ? { ...currentUser, ...userProfile } : null,
    login,
    logout,
    getAuthToken,
    invalidateUserSettingsCache
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
