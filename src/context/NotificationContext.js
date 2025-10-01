import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api';
import { updateMessageInterceptorPreferences } from '../utils/messageInterceptor';
import { updateGlobalNotificationPreferences } from '../utils/globalMessagePatch';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    systemNotifications: true
  });
  const [loading, setLoading] = useState(false);

  // Load notification preferences when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadNotificationPreferences();
    }
  }, [isAuthenticated]);

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotificationPreferences();
      if (response.success) {
        const newPreferences = {
          emailNotifications: response.data.emailNotifications,
          systemNotifications: response.data.systemNotifications
        };
        setNotificationPreferences(newPreferences);
        // Update the global message interceptor
        updateMessageInterceptorPreferences(newPreferences);
        updateGlobalNotificationPreferences(newPreferences);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      // Default to enabled if we can't load preferences
      setNotificationPreferences({
        emailNotifications: true,
        systemNotifications: true
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreferences = async (emailNotifications, systemNotifications) => {
    try {
      const response = await apiService.updateNotificationPreferences(emailNotifications, systemNotifications);
      if (response.success) {
        const newPreferences = {
          emailNotifications,
          systemNotifications
        };
        setNotificationPreferences(newPreferences);
        // Update the global message interceptor
        updateMessageInterceptorPreferences(newPreferences);
        updateGlobalNotificationPreferences(newPreferences);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return { success: false, message: error.message };
    }
  };

  // Smart notification function that respects user preferences
  const showNotification = (message, type = 'info', options = {}) => {
    // Always show critical system errors regardless of preferences
    const isCritical = options.critical || type === 'critical';
    
    if (!notificationPreferences.systemNotifications && !isCritical) {
      console.log(`🔕 System notification suppressed (user preference): ${message}`);
      return null;
    }

    // Return notification data for components to handle
    return {
      message,
      type,
      timestamp: Date.now(),
      ...options
    };
  };

  // Helper functions for different notification types
  const showSuccess = (message, options = {}) => showNotification(message, 'success', options);
  const showError = (message, options = {}) => showNotification(message, 'error', options);
  const showWarning = (message, options = {}) => showNotification(message, 'warning', options);
  const showInfo = (message, options = {}) => showNotification(message, 'info', options);

  // Critical notifications that bypass user preferences (security, system errors)
  const showCritical = (message, options = {}) => showNotification(message, 'critical', { ...options, critical: true });

  const value = {
    notificationPreferences,
    loading,
    loadNotificationPreferences,
    updateNotificationPreferences,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCritical,
    // Helper to check if notifications are enabled
    canShowNotifications: notificationPreferences.systemNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
