import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/firebase';
import { settingsService } from '@/services/settingsService';
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

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function getAuthToken() {
    if (currentUser) {
      return await getIdToken(currentUser);
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
          
          // Store raw Firebase user and separate profile data
          setCurrentUser(user);
          setUserProfile(newProfile);
        } catch (error) {
          console.error('Error fetching user settings:', error);
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
        setCurrentUser(null);
        setUserProfile(null);
        setLastNotificationCheck(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser: currentUser ? { ...currentUser, ...userProfile } : null,
    login,
    logout,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
