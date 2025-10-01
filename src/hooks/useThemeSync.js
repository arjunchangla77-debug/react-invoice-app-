import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Hook to sync theme with user preferences (simplified - no backend sync)
export const useThemeSync = () => {
  const { isAuthenticated } = useAuth();

  // Track previous authentication state to detect login/logout
  const [prevAuthenticated, setPrevAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    // Update previous state
    setPrevAuthenticated(isAuthenticated);
  }, [isAuthenticated]);
};

export default useThemeSync;
