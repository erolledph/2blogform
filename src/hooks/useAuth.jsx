import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/firebase';
import { settingsService } from '@/services/settingsService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user settings to get role and multi-blog permissions
          const userSettings = await settingsService.getUserSettings(user.uid);
          
          // Store raw Firebase user and separate profile data
          setCurrentUser(user);
          setUserProfile({
            role: userSettings.role || 'user',
            canManageMultipleBlogs: userSettings.canManageMultipleBlogs || false,
            currency: userSettings.currency || '$'
          });
        } catch (error) {
          console.error('Error fetching user settings:', error);
          // Set user and default profile if fetch fails
          setCurrentUser(user);
          setUserProfile({
            role: 'user',
            canManageMultipleBlogs: false,
            currency: '$'
          });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
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
