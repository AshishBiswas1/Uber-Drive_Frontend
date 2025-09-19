// src/app/authentication/reset-password/page.js - ROLE-BASED RESET PASSWORD
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [passwords, setPasswords] = useState({
    password: '',
    passwordConfirm: ''
  });
  const [userType, setUserType] = useState('rider');
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  // Extract token and user type from URL params
  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token) {
      setResetToken(token);
    } else {
      setIsTokenValid(false);
    }
    
    if (type && (type === 'rider' || type === 'driver')) {
      setUserType(type);
    }
  }, [searchParams]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  // Enhanced password validation
  const validatePasswords = () => {
    const newErrors = {};

    // Password validation
    if (!passwords.password) {
      newErrors.password = 'New password is required';
    } else if (passwords.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwords.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!passwords.passwordConfirm) {
      newErrors.passwordConfirm = 'Please confirm your new password';
    } else if (passwords.password !== passwords.passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Role-based reset password handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    if (!validatePasswords()) {
      setIsSubmitting(false);
      return;
    }

    if (!resetToken) {
      setErrors({ submit: 'Invalid or missing reset token. Please request a new password reset.' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Role-based API endpoints
      const endpoint = userType === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/resetPassword/${resetToken}`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/resetPassword/${resetToken}`;

      // Payload for password reset
      const payload = {
        password: passwords.password,
        passwordConfirm: passwords.passwordConfirm
      };

      // Make API request (public endpoint - no auth required)
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();

      // Handle different response status codes
      if (!response.ok) {
        if (response.status === 400) {
          if (data.message.includes('expired') || data.message.includes('invalid')) {
            throw new Error('Reset link has expired or is invalid. Please request a new password reset.');
          }
          throw new Error(data.message || 'Invalid request. Please check your input.');
        } else if (response.status === 404) {
          throw new Error('Reset token not found. Please request a new password reset.');
        } else if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again later.');
        } else {
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }
      }

      // Success handling
      const userTypeCapitalized = userType.charAt(0).toUpperCase() + userType.slice(1);
      const message = data.message || 'Password has been reset successfully!';
      
      setSuccessMessage(`🎉 ${message}`);
      setIsSuccess(true);

      // Auto-redirect to login after success
      setTimeout(() => {
        router.push(`/authentication/login`);
      }, 3000);

    } catch (err) {
      let errorMessage = err.message;
      
      if (err.message.includes('fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('expired') || err.message.includes('invalid')) {
        setIsTokenValid(false);
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If token is invalid, show error screen
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-red-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Invalid Reset Link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This password reset link is invalid or has expired
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-700">
                <p className="font-medium mb-2">Reset link is invalid or expired</p>
                <p>This could happen if:</p>
                <ul className="list-disc list-inside mt-2 text-left space-y-1">
                  <li>The link is older than 10 minutes</li>
                  <li>The link has already been used</li>
                  <li>The link was copied incorrectly</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/authentication/forgot-password"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Request New Reset Link
              </Link>

              <Link
                href="/authentication/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If password reset was successful
  if (isSuccess && successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-green-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Password Reset Successful
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your password has been updated successfully
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex justify-center">
                <svg className="h-12 w-12 text-green-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">Password Updated!</h3>
              <p className="text-sm text-green-700">
                Your {userType} account password has been successfully reset.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <p className="text-sm text-blue-700">
                <strong>Redirecting to login page in 3 seconds...</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can now sign in with your new password
              </p>
            </div>

            <Link
              href="/authentication/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Continue to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main reset password form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl mx-auto mb-4">
          🔐
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* User Type Display */}
          <div className="mb-6">
            <div className="text-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                userType === 'rider' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {userType === 'rider' ? '🚗' : '🚙'} {userType.charAt(0).toUpperCase() + userType.slice(1)} Account
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              Resetting password for your {userType} account
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={passwords.password}
                  onChange={handlePasswordChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your new password"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, and number (min 6 characters)
                </p>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  value={passwords.passwordConfirm}
                  onChange={handlePasswordChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your new password"
                />
                {errors.passwordConfirm && <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm}</p>}
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>

          {/* Back to Login */}
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
              Token: {resetToken ? resetToken.substring(0, 20) + '...' : 'Not found'} | Type: {userType}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
