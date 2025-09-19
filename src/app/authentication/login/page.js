// app/authentication/login/page.js - WITH FORGOT PASSWORD LINK
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // role can be 'rider' or 'driver'
  const [role, setRole] = useState('rider');

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Determine the API endpoint based on role
      const endpoint = role === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/login`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/login`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is important for cookies
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      // Store comprehensive user data in localStorage
      if (typeof window !== 'undefined') {
        // Clear any existing data first
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_image');
        localStorage.removeItem('user_phone');
        localStorage.removeItem('user_id');
        localStorage.removeItem('access_token');

        // Store auth status and role
        localStorage.setItem('isUserLoggedIn', 'true');
        localStorage.setItem('user_role', role);
        
        // Store token if provided in response
        if (data.token) {
          localStorage.setItem('access_token', data.token);
        }

        // Store user data from API response
        if (data.data && data.data.user) {
          const user = data.data.user;
          
          // Store user profile data
          localStorage.setItem('user_name', user.name || 'User');
          localStorage.setItem('user_email', user.email || '');
          localStorage.setItem('user_phone', user.phoneNo || '');
          localStorage.setItem('user_id', user._id || '');
          
          // Handle user image/photo
          let userImage = '/default-avatar.png'; // Default fallback
          if (user.photo) {
            // Assume photos are stored in a public images folder
            userImage = user.photo === 'default-rider.jpg' || user.photo === 'default-driver.jpg' 
              ? '/default-avatar.png' 
              : `/images/users/${user.photo}`;
          }
          localStorage.setItem('user_image', userImage);
        }

        // Trigger navbar refresh: Dispatch storage event to update navbar
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user_role',
          newValue: role,
          oldValue: null
        }));
      }

      // Redirect: Navigate based on role
      setTimeout(() => {
        if (role === 'rider') {
          router.push('/'); // rider home
        } else {
          router.push('/driver'); // driver home
        }
      }, 100); // Small delay to ensure storage events are processed

    } catch (err) {
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
              
              {/* Forgot Password Link with Role Parameter */}
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

        {/* Development Helper */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need an account?{' '}
            <Link href="/authentication/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up here
            </Link>
          </p>
          
          {/* Debug info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-400">
              Current role: {role} | Will redirect to: /authentication/forgot-password?type={role}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
