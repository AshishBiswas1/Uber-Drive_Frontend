// src/contexts/AuthContext.js - FINAL VERSION
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_BASE_URL = 'https://uber-drive-clone-backend.onrender.com';

  // ✅ Built-in Cookie Functions
  const getJWTCookie = () => {
    if (typeof document === 'undefined') return null;
    
    const name = 'jwt=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  };

  const clearJWTCookie = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  // ✅ Decode JWT and extract user ID
  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // ✅ Check both roles with correct data structure
  const checkUserFromBothRoles = async () => {
    const token = getJWTCookie();
    if (!token) {
      return null;
    }

    // ✅ Decode JWT to get user ID
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.id) {
      return null;
    }

    const roles = ['rider', 'driver'];
    
    for (const role of roles) {
      try {
        const url = `${API_BASE_URL}/api/drive/${role}/Me`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // ✅ Extract user from backend structure
          if (data && data.status === 'success') {
            let user = null;
            let userRole = role;
            
            // ✅ Backend structure: data.data.rider or data.data.driver
            if (data.data?.[role]) {
              user = data.data[role];
            } else if (data.data?.user) {
              user = data.data.user;
            } else if (data.data) {
              user = data.data;
            } else if (data.user) {
              user = data.user;
            }
            
            // ✅ Extract role from user object
            if (user?.role) {
              userRole = user.role;
            }
            
            // ✅ Validate user object
            if (user && (user._id || user.id || user.email || user.name)) {
              return {
                user: user,
                role: userRole
              };
            }
          }
        }
      } catch (error) {
        // Continue to next role
      }
    }
    
    return null;
  };

  // ✅ Authentication check - NEVER clears JWT automatically
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      
      try {
        const result = await checkUserFromBothRoles();
        
        if (result) {
          // ✅ User found - set authenticated state
          setUser(result.user);
          setIsAuthenticated(true);
          
          // ✅ Update localStorage with improved image handling
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_role', result.role);
            localStorage.setItem('user_name', result.user.name || 'User');
            localStorage.setItem('user_email', result.user.email || '');
            localStorage.setItem('user_id', result.user._id || result.user.id || '');
            localStorage.setItem('isUserLoggedIn', 'true');
            
            // ✅ IMPROVED: Smart default image handling
            let userImage = '/default-avatar.png'; // Fallback image
            
            if (result.user.photo && result.user.photo.trim() !== '') {
              const skipImages = [
                'default-rider.jpg', 
                'default-driver.jpg', 
                'default.png', 
                'avatar.png',
                'default-avatar.png'
              ];
              
              // Check if it's not a default image
              if (!skipImages.includes(result.user.photo)) {
                if (result.user.photo.startsWith('http')) {
                  // External URL
                  userImage = result.user.photo;
                } else if (result.user.photo.includes('/')) {
                  // Full path
                  userImage = result.user.photo;
                } else {
                  // Filename only - add path
                  userImage = `/images/users/${result.user.photo}`;
                }
              }
              // If it's a default image, keep the fallback
            }
            
            localStorage.setItem('user_image', userImage);
          }
        } else {
          // ✅ No user found but DON'T clear JWT
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // ✅ ONLY clear JWT on explicit logout
    clearJWTCookie();
    clearAuth();
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    
    // ✅ Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_image');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_phone');
      localStorage.removeItem('user_id');
      localStorage.removeItem('access_token');
      localStorage.removeItem('isUserLoggedIn');
    }
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
