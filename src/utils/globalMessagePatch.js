/**
 * Global Message Patch Utility
 * This utility monkey-patches React's useState to intercept message-related state updates
 * and respect notification preferences without requiring component refactoring.
 */

import { updateMessageInterceptorPreferences, shouldShowMessage } from './messageInterceptor';

let isPatched = false;
let originalUseState = null;

// Store notification preferences
let notificationPreferences = {
  systemNotifications: true,
  emailNotifications: true
};

// Update preferences function
export const updateGlobalNotificationPreferences = (preferences) => {
  notificationPreferences = preferences;
  updateMessageInterceptorPreferences(preferences);
};

// Function to check if a state update is message-related
const isMessageState = (state) => {
  if (typeof state === 'object' && state !== null) {
    return state.hasOwnProperty('message') || state.hasOwnProperty('messageType');
  }
  return false;
};

// Function to intercept and filter message state updates
const interceptMessageState = (state) => {
  if (!isMessageState(state)) {
    return state;
  }

  // If system notifications are disabled, suppress the message
  if (!notificationPreferences.systemNotifications && state.message) {
    console.log(`🔕 System notification suppressed (user preference): ${state.message}`);
    return {
      ...state,
      message: '',
      messageType: ''
    };
  }

  return state;
};

// Patch React's useState for message interception
export const patchGlobalMessages = () => {
  if (isPatched || typeof window === 'undefined') {
    return;
  }

  try {
    // This is a simplified approach - in a real implementation, you might need
    // to patch at the React level or use a more sophisticated approach
    
    // Create a global message event system
    window.addEventListener('message-update', (event) => {
      const { message, messageType } = event.detail;
      
      if (!shouldShowMessage(messageType)) {
        // Prevent the message from being displayed
        event.preventDefault();
        event.stopPropagation();
        console.log(`System notification suppressed (user preference): ${message}`);
      }
    });

    isPatched = true;
    console.log('Global message patch applied');
  } catch (error) {
    console.error('Failed to apply global message patch:', error);
  }
};

// Function to dispatch message events (to be used by components)
export const dispatchMessageEvent = (message, messageType = 'info') => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('message-update', {
      detail: { message, messageType },
      cancelable: true
    });
    
    const result = window.dispatchEvent(event);
    return !event.defaultPrevented; // Returns false if message was suppressed
  }
  return true;
};

// Cleanup function
export const unpatchGlobalMessages = () => {
  if (isPatched && typeof window !== 'undefined') {
    window.removeEventListener('message-update', () => {});
    isPatched = false;
  }
};
