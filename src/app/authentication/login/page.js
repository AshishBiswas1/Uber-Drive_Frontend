// app/authentication/login/page.js - WITH BUILT-IN JWT COOKIE MANAGEMENT
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState('rider');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ✅ Built-in Cookie Functions
  const setJWTCookie = (token) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days
    
    document.cookie = `jwt=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
    console.log('🍪 JWT cookie set for 90 days');
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://uber-drive-clone-backend.onrender.com';
      
      const endpoint = role === 'rider' 
        ? `${API_BASE}/api/drive/rider/login`
        : `${API_BASE}/api/drive/driver/login`;

      console.log('🔍 Making login request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      console.log('📡 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ Login successful:', data);

      // ✅ CRITICAL: Save JWT token to frontend cookie for 90 days
      if (data.status === 'success' && data.data?.user && data.token) {
        const userData = data.data.user;
        
        // ✅ 1. Save JWT token in cookie for 90 days
        setJWTCookie(data.token);
        
        // ✅ 2. Update AuthContext
        login(userData, data.token);

        // ✅ 3. Update localStorage for compatibility
        if (typeof window !== 'undefined') {
          // Clear existing data
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_name');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_image');
          localStorage.removeItem('user_phone');
          localStorage.removeItem('user_id');
          localStorage.removeItem('access_token');

          // Store new data
          localStorage.setItem('isUserLoggedIn', 'true');
          localStorage.setItem('user_role', role);
          localStorage.setItem('access_token', data.token);
          localStorage.setItem('user_name', userData.name || 'User');
          localStorage.setItem('user_email', userData.email || '');
          localStorage.setItem('user_phone', userData.phoneNo || '');
          localStorage.setItem('user_id', userData._id || '');
          
          // ✅ Handle user image safely
          let userImage = '/default-avatar.png';
          if (userData.photo) {
            const skipImages = ['default-rider.jpg', 'default-driver.jpg', 'default.png', 'avatar.png'];
            if (!skipImages.includes(userData.photo)) {
              if (userData.photo.startsWith('http')) {
                userImage = userData.photo;
              } else if (userData.photo.includes('/')) {
                userImage = userData.photo;
              } else {
                userImage = `/images/users/${userData.photo}`;
              }
            }
          }
          localStorage.setItem('user_image', userImage);

          // ✅ Trigger navbar refresh
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'user_role',
            newValue: role,
            oldValue: null
          }));
        }

        // ✅ Redirect after successful login
        setTimeout(() => {
          if (role === 'rider') {
            router.push('/');
          } else {
            router.push('/driver');
          }
        }, 500);
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
          R
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Sign in to RideFlex Pro
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/authentication/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sign in as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('rider')}
                  className={`w-full py-2 rounded-md border text-sm font-medium transition-colors ${
                    role === 'rider'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🚗 Rider
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`w-full py-2 rounded-md border text-sm font-medium transition-colors ${
                    role === 'driver'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🚙 Driver
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose your role to access the right features
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <Link 
                  href={`/authentication/forgot-password?type=${role}`} 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || !formData.email || !formData.password}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need an account?{' '}
            <Link href="/authentication/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up here
            </Link>
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-400">
              Current role: {role} | JWT will be saved for 90 days
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
