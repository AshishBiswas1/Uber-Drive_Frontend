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
    
    const url = `${API_BASE_URL}/api/auth/me`;
    console.log('🔍 Making request to:', url); // Debug log
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('📡 Response status:', response.status); // Debug log
      
      // ... rest of the code
    } catch (error) {
      console.error('❌ Request failed:', error); // Debug log
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
