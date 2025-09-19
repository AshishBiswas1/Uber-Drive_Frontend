// src/components/Navbar.js - WITH AUTHCONTEXT INTEGRATION & FAVICON LOGO
'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const router = useRouter();
  const { user: contextUser, isAuthenticated: contextAuth, isLoading: contextLoading, login: contextLogin, logout: contextLogout } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState({ name: '', image: '' });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Error popup state
  const [showRoleError, setShowRoleError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Enhanced cookie parsing helper
  const getCookieValue = useCallback((cookieName) => {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === cookieName) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }, []);

  // Safe JWT decode helper
  const decodeJWT = useCallback((token) => {
    try {
      if (!token || typeof token !== 'string') return null;
      
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = JSON.parse(atob(paddedPayload));
      
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      return null;
    }
  }, []);

  // Clear user data helper
  const clearUserData = useCallback(() => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserData({ name: '', image: '' });
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
  }, []);

  // Better name formatting helper
  const formatUserName = useCallback((name) => {
    if (!name || typeof name !== 'string') return 'User';
    
    const cleanName = name.trim();
    if (!cleanName) return 'User';
    
    const nameParts = cleanName.split(' ').filter(part => part.length > 0);
    const formattedParts = nameParts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    const fullName = formattedParts.join(' ');
    const firstName = formattedParts[0];
    
    return fullName.length > 20 ? firstName : fullName;
  }, []);

  // Show role-based error popup
  const showRoleErrorPopup = useCallback((requiredRole, currentRole) => {
    const requiredRoleText = requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1);
    const currentRoleText = currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Guest';
    
    setErrorMessage(`${requiredRoleText} Access Required`);
    setErrorDetails(`You're currently logged in as a ${currentRoleText}. This section is exclusively for ${requiredRoleText}s. Please sign up as a ${requiredRoleText} or switch to your ${requiredRoleText} account to access these features.`);
    setShowRoleError(true);
  }, []);

  // ✅ ENHANCED: Sync with AuthContext
  const syncWithContext = useCallback(() => {
    if (contextAuth && contextUser) {
      // Use data from AuthContext
      const formattedName = formatUserName(contextUser.name);
      const role = contextUser.userType || contextUser.role || 'rider';
      
      setIsAuthenticated(true);
      setUserRole(role);
      setUserData({ 
        name: formattedName, 
        image: contextUser.photo || '/default-avatar.png' 
      });

      // Update localStorage to keep in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_name', contextUser.name);
        localStorage.setItem('user_email', contextUser.email);
        if (contextUser.photo) {
          localStorage.setItem('user_image', contextUser.photo);
        }
        localStorage.setItem('isUserLoggedIn', 'true');
      }
    } else if (!contextLoading && !contextAuth) {
      // Context says not authenticated, clear everything
      clearUserData();
    }
  }, [contextAuth, contextUser, contextLoading, formatUserName, clearUserData]);

  // Main auth check function - Enhanced with Context priority
  const checkAuth = useCallback(() => {
    if (isChecking || contextLoading) return;

    setIsChecking(true);
    
    try {
      // Priority 1: Use AuthContext if available and authenticated
      if (contextAuth && contextUser) {
        syncWithContext();
        setIsChecking(false);
        return;
      }

      // Priority 2: Fallback to manual cookie/localStorage check
      const jwtToken = getCookieValue('jwt');
      const hasJWT = !!jwtToken;
      
      if (hasJWT) {
        const decodedToken = decodeJWT(jwtToken);
        
        if (decodedToken) {
          const storedUserData = typeof window !== 'undefined' ? {
            name: localStorage.getItem('user_name'),
            role: localStorage.getItem('user_role'), 
            image: localStorage.getItem('user_image'),
            email: localStorage.getItem('user_email')
          } : {};
          
          const role = storedUserData.role || 'rider';
          const rawUserName = storedUserData.name;
          const formattedUserName = formatUserName(rawUserName);
          const userImage = storedUserData.image || '/default-avatar.png';
          
          setIsAuthenticated(true);
          setUserRole(role);
          setUserData({ 
            name: formattedUserName, 
            image: userImage 
          });
        } else {
          clearUserData();
        }
      } else {
        if (isAuthenticated) {
          clearUserData();
        }
      }
    } catch (error) {
      clearUserData();
    } finally {
      setIsChecking(false);
    }
  }, [getCookieValue, decodeJWT, clearUserData, isAuthenticated, isChecking, formatUserName, contextAuth, contextUser, contextLoading, syncWithContext]);

  // Image error handling
  const handleImageError = (e) => {
    e.target.src = '/default-avatar.png';
  };

  // Favicon/logo error handling
  const handleLogoError = (e) => {
    // If favicon fails to load, fallback to the R text logo
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'flex';
  };

  // ✅ ENHANCED: Initial auth check with context sync
  useEffect(() => {
    if (!contextLoading) {
      checkAuth();
    }
  }, [checkAuth, contextLoading]);

  // Sync when context changes
  useEffect(() => {
    if (!contextLoading) {
      syncWithContext();
    }
  }, [contextAuth, contextUser, contextLoading, syncWithContext]);

  // Setup intervals and listeners
  useEffect(() => {
    const interval = setInterval(() => {
      if (!contextLoading) {
        checkAuth();
      }
    }, 60000);
    
    const handleStorageChange = (e) => {
      if (e.key === 'user_role' || e.key === 'user_name' || e.key === 'user_image') {
        setTimeout(checkAuth, 100);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [checkAuth, contextLoading]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Role-based navigation with error popups
  const handleNavigation = (path) => {
    // Use context authentication status if available
    const authStatus = contextAuth !== undefined ? contextAuth : isAuthenticated;
    const currentRole = contextUser?.userType || contextUser?.role || userRole;

    // Check for role-specific pages
    if (path === '/rider') {
      if (!authStatus) {
        router.push('/authentication/login');
        return;
      }
      
      if (currentRole !== 'rider') {
        showRoleErrorPopup('rider', currentRole);
        return;
      }
    } else if (path === '/driver') {
      if (!authStatus) {
        router.push('/authentication/login');
        return;
      }
      
      if (currentRole !== 'driver') {
        showRoleErrorPopup('driver', currentRole);
        return;
      }
    }
    
    router.push(path);
  };

  // ✅ ENHANCED: Enhanced logout with context integration
  const handleLogout = async () => {
    try {
      // Use context logout if available
      if (contextLogout) {
        await contextLogout();
      }

      // Manual cleanup as fallback
      document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure;';
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_image');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_phone');
        localStorage.removeItem('user_id');
        localStorage.removeItem('access_token');
        localStorage.removeItem('isUserLoggedIn');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires');
        localStorage.removeItem('session_id');
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_status');
      }

      clearUserData();
      setShowUserMenu(false);
      setIsMobileMenuOpen(false);

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }, 100);
      
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Close error popup
  const closeRoleError = () => {
    setShowRoleError(false);
    setErrorMessage('');
    setErrorDetails('');
  };

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'For Riders', href: '/rider' },
    { name: 'For Drivers', href: '/driver' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  // ✅ ENHANCED: Use context data with fallback
  const displayAuth = contextAuth !== undefined ? contextAuth : isAuthenticated;
  const displayUser = contextUser || userData;
  const displayRole = contextUser?.userType || contextUser?.role || userRole;
  const isLoading = contextLoading || isChecking;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with Favicon */}
            <Link href="/" className="flex items-center space-x-2">
              {/* Favicon Image Logo */}
              <div className="relative w-8 h-8">
                <img
                  src="/assets/favicon.png"
                  alt="RideFlex Pro Logo"
                  className="w-8 h-8 rounded-lg object-contain"
                  onError={handleLogoError}
                />
                {/* Fallback R Logo (hidden by default) */}
                <div 
                  className="absolute inset-0 bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{ display: 'none' }}
                >
                  R
                </div>
              </div>
              <span className="font-bold text-xl text-gray-900">RideFlex Pro</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Desktop Right Section */}
            <div className="hidden md:flex items-center space-x-4">
              {isLoading ? (
                // Loading state
                <div className="animate-pulse flex space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="w-20 h-8 bg-gray-300 rounded"></div>
                </div>
              ) : displayAuth ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {/* User Avatar Circle */}
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                          <img
                            src={displayUser.image || displayUser.photo || '/default-avatar.png'}
                            alt={`${displayUser.name || 'User'}'s avatar`}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900" title={displayUser.name || 'User'}>
                          {formatUserName(displayUser.name) || 'User'}
                        </span>
                        {displayRole && (
                          <span className="text-xs text-gray-500 capitalize">{displayRole}</span>
                        )}
                      </div>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                            <img
                              src={displayUser.image || displayUser.photo || '/default-avatar.png'}
                              alt={`${displayUser.name || 'User'}'s avatar`}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" title={displayUser.name || 'User'}>
                              {displayUser.name || 'Guest User'}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">{displayRole || 'Member'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          router.push('/profile/settings');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Profile Settings
                      </button>
                      
                      <button
                        onClick={() => {
                          router.push('/dashboard');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Dashboard
                      </button>
                      
                      <hr className="my-2" />
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <svg className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/authentication/login"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/authentication/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Signup
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    handleNavigation(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                >
                  {item.name}
                </button>
              ))}
              
              {/* Mobile Auth Section */}
              <div className="pt-4 space-y-2 border-t border-gray-200">
                {displayAuth ? (
                  <>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                            <img
                              src={displayUser.image || displayUser.photo || '/default-avatar.png'}
                              alt={`${displayUser.name || 'User'}'s avatar`}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          </div>
                          <div className="absolute -bottom-0 -right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900" title={displayUser.name || 'User'}>
                            {displayUser.name || 'Guest User'}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{displayRole || 'Member'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        router.push('/profile/settings');
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Profile Settings
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                    >
                      <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/authentication/login"
                      className="block w-full text-center px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/authentication/signup"
                      className="block w-full text-center px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Signup
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Role-Based Error Popup Modal */}
      {showRoleError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {errorMessage}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {errorDetails}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => {
                    closeRoleError();
                    router.push('/authentication/signup');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Sign Up
                </button>
                <button
                  onClick={closeRoleError}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
