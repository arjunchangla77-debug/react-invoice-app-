import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing messages with auto-dismiss functionality
 * @param {number} autoDismissTime - Time in milliseconds before auto-dismiss (default: 5000)
 * @returns {object} - { message, messageType, setMessage, setMessageType, clearMessage }
 */
export const useAutoMessage = (autoDismissTime = 5000) => {
  const [message, setMessageState] = useState('');
  const [messageType, setMessageTypeState] = useState('');

  const clearMessage = useCallback(() => {
    setMessageState('');
    setMessageTypeState('');
  }, []);

  const setMessage = useCallback((newMessage, type = 'info') => {
    setMessageState(newMessage);
    setMessageTypeState(type);
  }, []);

  const setMessageType = useCallback((type) => {
    setMessageTypeState(type);
  }, []);

  // Auto-dismiss effect
  useEffect(() => {
    if (message && autoDismissTime > 0) {
      const timer = setTimeout(() => {
        clearMessage();
      }, autoDismissTime);

      return () => clearTimeout(timer);
    }
  }, [message, autoDismissTime, clearMessage]);

  return {
    message,
    messageType,
    setMessage,
    setMessageType,
    clearMessage
  };
};

export default useAutoMessage;
