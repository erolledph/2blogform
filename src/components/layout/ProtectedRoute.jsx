import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Future: Add role-based access control
  // if (requiredRole && !hasRole(currentUser, requiredRole)) {
  //   return <Navigate to="/dashboard" />;
  // }
  
  return children;
}