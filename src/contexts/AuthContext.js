'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ FIXED: Correct API URL construction
  const API_BASE_URL = 'https://uber-drive-clone-backend.onrender.com';

  // ✅ Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      
      try {
        // ✅ FIXED: Use proper URL construction
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // ✅ Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data?.user) {
            const userData = data.data.user;
            
            // Update state
            setUser(userData);
            setIsAuthenticated(true);
            
            console.log('✅ Authentication restored from cookie');
          } else {
            throw new Error('Invalid user data');
          }
        } else {
          // No valid cookie or expired
          clearAuth();
        }
      } catch (error) {
        console.log('⚠️ No valid authentication found:', error.message);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    
    console.log('✅ User logged in successfully');
  };

  const logout = async () => {
    try {
      // ✅ FIXED: Use proper URL construction
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
    
    clearAuth();
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('🔓 User logged out');
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
