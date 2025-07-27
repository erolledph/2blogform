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
          
          // Extend user object with settings
          const extendedUser = {
            ...user,
            role: userSettings.role || 'user',
            canManageMultipleBlogs: userSettings.canManageMultipleBlogs || false,
            currency: userSettings.currency || '$'
          };
          
          setCurrentUser(extendedUser);
        } catch (error) {
          console.error('Error fetching user settings:', error);
          // Set user with default settings if fetch fails
          setCurrentUser({
            ...user,
            role: 'user',
            canManageMultipleBlogs: false,
            currency: '$'
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
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