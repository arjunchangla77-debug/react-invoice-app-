/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Handles:
 * - User login/logout functionality
 * - Token management and persistence
 * - User profile data
 * - Authentication state checking
 * - Automatic token validation on app load
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

// Create the authentication context
const AuthContext = createContext();

/**
 * Custom hook to access authentication context
 * Throws error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Wraps the application to provide authentication state
 */
export const AuthProvider = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState(null); // Current user data
  const [loading, setLoading] = useState(true); // Loading state during auth checks
  const [error, setError] = useState(null); // Authentication errors

  /**
   * Initialize authentication state on app load
   * Checks for existing token and validates it with the server
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user has a stored authentication token
        if (apiService.isAuthenticated()) {
          // Validate token and get user profile
          const response = await apiService.getProfile();
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Remove invalid token
        apiService.removeAuthToken();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login function
   * Authenticates user with email/password and stores token
   */
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.login({
        login: credentials.username, // backend expects 'login' field
        password: credentials.password
      });

      const { token, user: userData } = response.data;
      
      // Store token and user data
      apiService.setAuthToken(token);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.register(userData);
      const { token, user: newUser } = response.data;
      
      // Store token and user data
      apiService.setAuthToken(token);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.forgotPassword(email);
      return { success: true, message: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.resetPassword(token, newPassword);
      return { success: true, message: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.changePassword(currentPassword, newPassword);
      return { success: true, message: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.removeAuthToken();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
