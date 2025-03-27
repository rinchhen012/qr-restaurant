import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string, isKitchenDisplay?: boolean) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const SESSION_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds
const ACTIVITY_TIMEOUT = 1000 * 60 * 30; // 30 minutes in milliseconds

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activityTimeout, setActivityTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isKitchenSession, setIsKitchenSession] = useState(false);
  const toast = useToast();

  // Function to reset activity timer
  const resetActivityTimer = () => {
    // Don't set activity timeout for kitchen display
    if (isKitchenSession) return;

    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      logout();
    }, ACTIVITY_TIMEOUT);
    
    setActivityTimeout(newTimeout);
  };

  // Set up activity listeners
  useEffect(() => {
    if (isAuthenticated && !isKitchenSession) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const handleActivity = () => resetActivityTimer();
      
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      // Initial activity timer
      resetActivityTimer();

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
      };
    }
  }, [isAuthenticated, isKitchenSession]);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('adminToken');
    const isKitchen = localStorage.getItem('isKitchenSession') === 'true';
    setIsKitchenSession(isKitchen);

    if (token) {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      
      if (Date.now() >= expirationTime) {
        // Token has expired
        logout();
      } else {
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setIsAuthenticated(true);
        
        // Set up session timeout (skip for kitchen display)
        if (!isKitchen) {
          const timeoutDuration = Math.min(expirationTime - Date.now(), SESSION_DURATION);
          const timeout = setTimeout(() => {
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please log in again.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            logout();
          }, timeoutDuration);
          
          setSessionTimeout(timeout);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, isKitchenDisplay = false) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('isKitchenSession', isKitchenDisplay.toString());
      setIsKitchenSession(isKitchenDisplay);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);

      // Set up session timeout (skip for kitchen display)
      if (!isKitchenDisplay) {
        const timeout = setTimeout(() => {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          logout();
        }, SESSION_DURATION);
        
        setSessionTimeout(timeout);
        resetActivityTimer();
      }
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isKitchenSession');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setIsKitchenSession(false);
    
    // Clear timeouts
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}; 