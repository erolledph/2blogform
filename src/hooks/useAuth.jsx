import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { settingsService } from '@/services/settingsService';
import { useCache } from './useCache';
import { webSocketService } from '@/services/webSocketService';
import { userNotificationService } from '@/services/userNotificationService';
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
      let title = "Account Limits Updated";
      let description = "Congratulations! ";
      const updates = [];
      
      if (maxBlogsChanged) {
        updates.push(`${newProfile.maxBlogs} blog${newProfile.maxBlogs > 1 ? 's' : ''}`);
      }
      
      if (storageChanged) {
        updates.push(`${newProfile.totalStorageMB} MB storage`);
      }
      
      if (updates.length === 2) {
        description += `You have been granted ${updates[0]} and ${updates[1]}!`;
      } else {
        description += `You have been granted ${updates[0]}!`;
      }
      
      // Add persistent notification to Firestore
      try {
        await userNotificationService.addNotification(
          user.uid,
          'limit_increase',
          title,
          description
        );
        console.log('Persistent notification added for limit increase');
      } catch (error) {
        console.error('Failed to add persistent notification:', error);
        // Fallback to toast if notification service fails
        toast.success(description, {
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
          
          // SECURITY: Validate that client-side profile matches server data
          // This prevents manipulation of role/limits in browser
          const serverValidatedProfile = {
            role: userSettings.role || 'user',
            canManageMultipleBlogs: userSettings.canManageMultipleBlogs || false,
            currency: userSettings.currency || '$',
            maxBlogs: userSettings.maxBlogs || 1,
            totalStorageMB: userSettings.totalStorageMB || 100
          };
          
          // Log any discrepancies for security monitoring
          if (JSON.stringify(newProfile) !== JSON.stringify(serverValidatedProfile)) {
            console.warn('Client-server profile mismatch detected:', {
              client: newProfile,
              server: serverValidatedProfile,
              userId: user.uid
            });
          }
          
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
          
          // Use functional update to compare with previous profile and check for admin notifications
          setUserProfile(prevProfile => {
            // Check for admin notifications before updating profile
            if (prevProfile) {
              checkForAdminNotifications(user, serverValidatedProfile, prevProfile);
            }
            return serverValidatedProfile;
          });
          
          // Dispatch auth state change for WebSocket auto-connect
          window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { user, blogId: null } // blogId will be set later
          }));
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
        
        // Disconnect WebSocket on logout
        webSocketService.disconnect();
        
        // Clear cache when user logs out
        cache.clear();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []); // Remove userProfile dependency to prevent re-render loop

 // Set up real-time listener for user settings changes
 useEffect(() => {
   let unsubscribeUserSettings = () => {};
   
   if (currentUser?.uid) {
     console.log('Setting up real-time user settings listener for:', currentUser.uid);
     
     const userSettingsRef = doc(db, 'users', currentUser.uid, 'userSettings', 'preferences');
     
     unsubscribeUserSettings = onSnapshot(
       userSettingsRef,
       (docSnapshot) => {
         if (docSnapshot.exists()) {
           const newSettings = docSnapshot.data();
           console.log('User settings changed in real-time:', newSettings);
           
           const newProfile = {
             role: newSettings.role || 'user',
             canManageMultipleBlogs: newSettings.canManageMultipleBlogs || false,
             currency: newSettings.currency || '$',
             maxBlogs: newSettings.maxBlogs || 1,
             totalStorageMB: newSettings.totalStorageMB || 100
           };
           
           // Update profile and check for admin notifications
           setUserProfile(prevProfile => {
             if (prevProfile) {
               checkForAdminNotifications(currentUser, newProfile, prevProfile);
             }
             return newProfile;
           });
           
           // Invalidate cache to ensure fresh data on next fetch
           invalidateUserSettingsCache(currentUser.uid);
         } else {
           console.log('User settings document does not exist, using defaults');
           // Set default profile if document doesn't exist
           setUserProfile({
             role: 'user',
             canManageMultipleBlogs: false,
             currency: '$',
             maxBlogs: 1,
             totalStorageMB: 100
           });
         }
       },
       (error) => {
         console.error('Error in user settings listener:', error);
         // Don't update profile on error to maintain current state
       }
     );
   }
   
   // Cleanup listener when user changes or component unmounts
   return () => {
     unsubscribeUserSettings();
   };
 }, [currentUser?.uid]); // Only depend on user ID to prevent re-subscription loops
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
