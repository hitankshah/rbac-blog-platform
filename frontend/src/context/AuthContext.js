import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

// Create the AuthContext
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Logout function as useCallback
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Clear local storage and state first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setCurrentUser(null);

      // Optionally notify backend, but don't wait for it
      authService.logout().catch(() => {});
    } finally {
      setLoading(false);
      navigate('/login');
    }
  }, [navigate]);

  // Load user from localStorage on initial render
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          
          // Verify token validity with the server
          try {
            const response = await authService.getCurrentUser();
            setCurrentUser(response.data);
            
            // Redirect if on login page
            if (window.location.pathname === '/login') {
              if (response.data.role === 'admin') {
                navigate('/admin/dashboard');
              } else {
                navigate('/');
              }
            }
          } catch (err) {
            console.error('Token validation error:', err);
            // If token is invalid, log the user out
            logout();
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [logout, navigate]); // Added navigate to dependencies

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(email, password);
      
      const { user, token } = response.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update context
      setCurrentUser(user);
      
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
      
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      // Don't log the user in automatically, require email verification
      navigate('/login', { state: { message: 'Registration successful. Please check your email for verification.' } });
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    isAdmin: currentUser?.role === 'admin',
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
