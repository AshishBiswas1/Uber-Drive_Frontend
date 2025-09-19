// src/app/authentication/signup/page.js - SIMPLIFIED WITHOUT PHONE VERIFICATION
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '', 
    password: '',
    confirmPassword: '',
    licenseNo: '', 
    userType: 'rider' 
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
    if (errors.submit) {
      setErrors({
        ...errors,
        submit: ''
      });
    }
  };

  // Enhanced validation with better error messages
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone number validation
    if (!formData.phoneNo.trim()) {
      newErrors.phoneNo = 'Phone number is required';
    } else {
      const phoneDigits = formData.phoneNo.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        newErrors.phoneNo = 'Phone number must be at least 10 digits';
      } else if (phoneDigits.length > 15) {
        newErrors.phoneNo = 'Phone number must be less than 15 digits';
      }
    }

    // License number validation for drivers
    if (formData.userType === 'driver') {
      if (!formData.licenseNo.trim()) {
        newErrors.licenseNo = 'Driving license number is required for drivers';
      } else if (formData.licenseNo.length < 8) {
        newErrors.licenseNo = 'License number must be at least 8 characters';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Direct redirect to landing page
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');
    
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Format phone number (add +91 if not present)
      const formattedPhoneNo = formData.phoneNo.startsWith('+') 
        ? formData.phoneNo 
        : `+91${formData.phoneNo.replace(/\D/g, '')}`;

      // Determine API endpoint based on user type
      const endpoint = formData.userType === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/signup`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/signup`;

      // Build request payload
      const payload = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        phoneNo: formattedPhoneNo,
      };

      // Add license number for drivers
      if (formData.userType === 'driver') {
        payload.licenceNo = formData.licenseNo.trim().toUpperCase();
      }

      // Make request to backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('An account with this email or phone number already exists');
        }
        throw new Error(data.message || `Signup failed with status ${response.status}`);
      }

      // Store user data in localStorage
      if (typeof window !== 'undefined' && data.data && data.data.user) {
        const user = data.data.user;
        const userRole = formData.userType;
        const userName = user.name || formData.name.trim();
        const userEmail = user.email || formData.email.toLowerCase().trim();
        const userPhone = user.phoneNo || formattedPhoneNo;
        const userId = user._id;
        
        // Store all user data
        localStorage.setItem('isUserLoggedIn', 'true');
        localStorage.setItem('user_role', userRole);
        localStorage.setItem('user_name', userName);
        localStorage.setItem('user_email', userEmail);
        localStorage.setItem('user_phone', userPhone);
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_image', '/default-avatar.png');
        localStorage.setItem('phone_verified', 'true'); // Skip verification
        
        if (data.token) {
          localStorage.setItem('access_token', data.token);
        }

        // Trigger navbar refresh
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user_role',
          newValue: userRole,
          oldValue: null
        }));
      }

      const userTypeCapitalized = formData.userType.charAt(0).toUpperCase() + formData.userType.slice(1);
      
      // Success: Direct redirect to landing page
      setSuccessMessage(`🎉 ${userTypeCapitalized} account created successfully! Redirecting to home...`);
      
      setTimeout(() => {
        router.push('/'); // Direct to landing page
      }, 1500);

    } catch (err) {
      let errorMessage = err.message;
      
      if (err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('email')) {
        setErrors({ email: err.message });
        setIsSubmitting(false);
        return;
      } else if (err.message.includes('phone')) {
        setErrors({ phoneNo: err.message });
        setIsSubmitting(false);
        return;
      }
      
      setErrors({ submit: errorMessage });
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
          Create your RideFlex Pro account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/authentication/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 rounded-md bg-green-50 p-3 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I want to join as a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, userType: 'rider', licenseNo: ''})}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    formData.userType === 'rider'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🚗 Rider
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, userType: 'driver'})}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    formData.userType === 'driver'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🚙 Driver
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
            </div>

            {/* Email */}
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
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700">
                📱 Phone number
              </label>
              <div className="mt-1">
                <input
                  id="phoneNo"
                  name="phoneNo"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phoneNo}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.phoneNo ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number (e.g., +91 9876543210)"
                />
                {errors.phoneNo && <p className="mt-1 text-sm text-red-600">{errors.phoneNo}</p>}
              </div>
            </div>

            {/* License Number Field - Only for Drivers */}
            {formData.userType === 'driver' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label htmlFor="licenseNo" className="block text-sm font-medium text-gray-700">
                  <span className="text-blue-700">🪪</span> Driving License Number *
                </label>
                <div className="mt-1">
                  <input
                    id="licenseNo"
                    name="licenseNo"
                    type="text"
                    required={formData.userType === 'driver'}
                    value={formData.licenseNo}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.licenseNo ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your driving license number"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.licenseNo && <p className="mt-1 text-sm text-red-600">{errors.licenseNo}</p>}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, and number
                </p>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </Link>
              </label>
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
                    Creating {formData.userType} account...
                  </>
                ) : (
                  `Create ${formData.userType} account`
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Already have an account?{' '}
            <Link href="/authentication/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
