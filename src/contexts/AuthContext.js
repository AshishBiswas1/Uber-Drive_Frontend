'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      
      try {
        // Make request to backend to verify JWT cookie
        const response = await fetch(`${process.env.NEXT_PUBLIC_APIBASE}/api/auth/me`, {
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
            
            // Update localStorage for navbar sync
            localStorage.setItem('isUserLoggedIn', 'true');
            localStorage.setItem('userrole', userData.userType || userData.role);
            localStorage.setItem('username', userData.name);
            localStorage.setItem('useremail', userData.email);
            if (userData.photo) {
              localStorage.setItem('userimage', userData.photo);
            }
            
            console.log('✅ Authentication restored from cookie');
          } else {
            throw new Error('Invalid user data');
          }
        } else {
          // No valid cookie or expired
          clearAuth();
        }
      } catch (error) {
        console.log('⚠️ No valid authentication found');
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
    
    // Update localStorage for navbar
    localStorage.setItem('isUserLoggedIn', 'true');
    localStorage.setItem('userrole', userData.userType || userData.role);
    localStorage.setItem('username', userData.name);
    localStorage.setItem('useremail', userData.email);
    if (userData.photo) {
      localStorage.setItem('userimage', userData.photo);
    }
    
    console.log('✅ User logged in successfully');
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear cookie
      await fetch(`${process.env.NEXT_PUBLIC_APIBASE}/api/auth/logout`, {
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
    
    // Clear localStorage
    localStorage.removeItem('isUserLoggedIn');
    localStorage.removeItem('userrole');
    localStorage.removeItem('username');
    localStorage.removeItem('useremail');
    localStorage.removeItem('userimage');
    
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
