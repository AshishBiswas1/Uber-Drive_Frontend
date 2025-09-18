// src/app/authentication/forgot-password/page.js - FORGOT PASSWORD PAGE WITH ROLE-BASED API ROUTING
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('rider'); // Default to rider
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get user type from URL params if provided (from login page)
  useEffect(() => {
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && (typeFromUrl === 'rider' || typeFromUrl === 'driver')) {
      setUserType(typeFromUrl);
    }
  }, [searchParams]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear errors when user starts typing
    if (errors.email) {
      setErrors({ ...errors, email: '' });
    }
    if (errors.submit) {
      setErrors({ ...errors, submit: '' });
    }
  };

  // Enhanced email validation
  const validateEmail = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    } else if (email.length > 254) {
      newErrors.email = 'Email address is too long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🔧 MAIN: Role-based forgot password handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    if (!validateEmail()) {
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('🔑 Starting forgot password process for:', userType);
      console.log('📧 Email:', email);

      // 🔧 ROLE-BASED API ENDPOINTS - Note the typo "froget" as specified in your request
      const endpoint = userType === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/forgetPassword`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/forgetPassword`;

      console.log('📡 API Endpoint:', endpoint);

      // Prepare request payload
      const payload = {
        email: email.toLowerCase().trim()
      };

      console.log('📦 Payload being sent:', payload);

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies if needed
        body: JSON.stringify(payload),
      });

      console.log('📨 Response status:', response.status);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📨 Response data:', data);

      // Handle different response status codes
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No ${userType} account found with this email address`);
        } else if (response.status === 400) {
          throw new Error(data.message || 'Invalid email address format');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait before trying again');
        } else if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again later');
        } else {
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }
      }

      // Success handling
      console.log('✅ Forgot password request successful!', data);
      
      const userTypeCapitalized = userType.charAt(0).toUpperCase() + userType.slice(1);
      const message = data.message || `Password reset link sent successfully!`;
      
      setSuccessMessage(`🎉 ${message}`);
      setIsSubmitted(true);

      console.log(`📧 Reset email sent to ${email} for ${userTypeCapitalized}`);

    } catch (err) {
      console.error('❌ Forgot password error:', err);
      
      let errorMessage = err.message;
      
      if (err.message.includes('fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('email')) {
        setErrors({ email: err.message });
        setIsSubmitting(false);
        return;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully submitted, show success screen
  if (isSubmitted && successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-green-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Password reset instructions sent
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {/* Success Message */}
            <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Email Sent Successfully!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>We've sent password reset instructions to <strong>{email}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="rounded-md bg-blue-50 p-4 mb-6">
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-2">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Check your email inbox</li>
                    <li>Look for an email from RideFlex Pro</li>
                    <li>Click the reset link in the email</li>
                    <li>Set your new password</li>
                  </ol>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSuccessMessage('');
                    setEmail('');
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Send Another Email
                </button>

                <Link
                  href="/authentication/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main forgot password form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
          🔑
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Forgot Your Password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* User Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('rider')}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  userType === 'rider'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🚗 Rider
              </button>
              <button
                type="button"
                onClick={() => setUserType('driver')}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  userType === 'driver'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🚙 Driver
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select your account type to receive the correct reset link
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Address */}
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
                  value={email}
                  onChange={handleEmailChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/authentication/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              ← Back to Login
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="font-medium text-blue-600 hover:text-blue-500">
              Contact Support
            </Link>
          </p>
          
          {/* Debug info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-400">
              Debug: API Base = {process.env.NEXT_PUBLIC_API_BASE || 'Not set'} | Type: {userType}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
