/**
 * Message Interceptor Utility
 * Handles notification preferences and message filtering
 */

// Store notification preferences
let messagePreferences = {
  systemNotifications: true,
  emailNotifications: true
};

/**
 * Update message interceptor preferences
 * @param {Object} preferences - Notification preferences object
 */
export const updateMessageInterceptorPreferences = (preferences) => {
  messagePreferences = { ...messagePreferences, ...preferences };
};

/**
 * Check if a message should be shown based on preferences
 * @param {string} messageType - Type of message (system, email, etc.)
 * @returns {boolean} - Whether the message should be shown
 */
export const shouldShowMessage = (messageType) => {
  switch (messageType) {
    case 'system':
      return messagePreferences.systemNotifications;
    case 'email':
      return messagePreferences.emailNotifications;
    default:
      return true; // Show unknown message types by default
  }
};

/**
 * Get current message preferences
 * @returns {Object} - Current notification preferences
 */
export const getMessagePreferences = () => {
  return { ...messagePreferences };
};
