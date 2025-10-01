import React, { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * MessageSuppressor Component
 * This component intercepts and suppresses messages in child components
 * based on user notification preferences
 */
const MessageSuppressor = ({ children }) => {
  const { canShowNotifications } = useNotification();

  useEffect(() => {
    if (!canShowNotifications) {
      // Override common message display methods
      const originalAlert = window.alert;
      const originalConfirm = window.confirm;

      // Suppress alerts and confirms when notifications are disabled
      window.alert = (message) => {
        console.log(`🔕 Alert suppressed (user preference): ${message}`);
        return undefined;
      };

      window.confirm = (message) => {
        console.log(`🔕 Confirm suppressed (user preference): ${message}`);
        return true; // Default to true for confirms
      };

      // Cleanup function to restore original methods
      return () => {
        window.alert = originalAlert;
        window.confirm = originalConfirm;
      };
    }
  }, [canShowNotifications]);

  // Intercept React error boundaries and validation messages
  useEffect(() => {
    if (!canShowNotifications) {
      // Add CSS to hide common message elements
      const style = document.createElement('style');
      style.textContent = `
        .message-suppressed .alert,
        .message-suppressed .notification,
        .message-suppressed .toast,
        .message-suppressed .error-message,
        .message-suppressed .success-message,
        .message-suppressed .warning-message,
        .message-suppressed .info-message,
        .message-suppressed [class*="message"],
        .message-suppressed [class*="alert"],
        .message-suppressed [class*="notification"] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [canShowNotifications]);

  // Wrap children with message suppression class when needed
  return (
    <div className={!canShowNotifications ? 'message-suppressed' : ''}>
      {children}
    </div>
  );
};

export default MessageSuppressor;
