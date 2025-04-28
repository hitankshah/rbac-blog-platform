import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Route that requires authentication
export const ProtectedRoute = ({ children, roles = [] }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  if (roles.length > 0 && !roles.includes(currentUser.role)) {
    // User doesn't have required role, redirect to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};
