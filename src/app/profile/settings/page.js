// src/app/profile/settings/page.js - NO AUTHENTICATION CHECKS
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileSettingsPage() {
  const router = useRouter();
  
  // User state - always loaded from localStorage without validation
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    photo: null
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: ''
  });

  // Phone verification always set to true
  const [phoneVerification, setPhoneVerification] = useState({
    isVerified: true,
    isVerifying: false,
    sessionId: null,
    verificationStep: 'idle',
    otp: '',
    resendTimer: 0,
    canResend: false,
    backendVerified: true
  });

  // UI state
  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [profileImage, setProfileImage] = useState('/default-avatar.png');
  const [imagePreview, setImagePreview] = useState('/default-avatar.png');

  // ✅ SIMPLIFIED: Just load data from localStorage - NO AUTH VALIDATION
  useEffect(() => {
    console.log('🔄 Loading profile data from localStorage...');
    
    if (typeof window !== 'undefined') {
      // Get data from localStorage - no validation
      const name = localStorage.getItem('user_name') || 'John Doe';
      const email = localStorage.getItem('user_email') || 'user@example.com';
      const phone = localStorage.getItem('user_phone') || '+91 9876543210';
      const role = localStorage.getItem('user_role') || 'rider';
      const image = localStorage.getItem('user_image') || '/default-avatar.png';

      console.log('📋 Profile data loaded:', { name, email, phone, role });

      // Set all state
      setUser({
        name,
        email,
        phoneNo: phone,
        photo: image,
        phoneVerified: true // Always true
      });

      setUserRole(role);

      setProfileData({
        name,
        email,
        phoneNo: phone,
        photo: null
      });

      setProfileImage(image);
      setImagePreview(image);

      // Always set phone as verified
      setPhoneVerification(prev => ({
        ...prev,
        isVerified: true,
        backendVerified: true
      }));

      // Set localStorage to verified if not already
      localStorage.setItem('user_phone_verified', 'true');
      localStorage.setItem('phone_verified_at', new Date().toISOString());
      localStorage.setItem('verification_method', 'Auto-Verified');

      console.log('✅ Profile setup complete - Phone verification set to TRUE');
    }
    
    // Always finish loading after 1 second
    setTimeout(() => {
      setIsLoading(false);
      console.log('✅ Profile page loaded successfully');
    }, 1000);

  }, []); // Run only once on mount

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ photo: 'Please select a valid image file (JPEG, PNG, GIF)' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ photo: 'Image size should be less than 5MB' });
        return;
      }

      setProfileData(prev => ({
        ...prev,
        photo: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear errors
      setErrors(prev => ({ ...prev, photo: '' }));
    }
  };

  // Validate profile form
  const validateProfileForm = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (profileData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (profileData.phoneNo.trim() && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(profileData.phoneNo.trim())) {
      newErrors.phoneNo = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!passwordData.newPasswordConfirm) {
      newErrors.newPasswordConfirm = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      newErrors.newPasswordConfirm = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;

    setIsSubmittingProfile(true);
    setErrors({});
    setSuccessMessage('');

    try {
      console.log('🔄 Simulating profile update...');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update localStorage with new data
      localStorage.setItem('user_name', profileData.name.trim());
      localStorage.setItem('user_email', profileData.email.trim().toLowerCase());
      if (profileData.phoneNo.trim()) {
        localStorage.setItem('user_phone', profileData.phoneNo.trim());
      }

      // Always set phone verification to true
      localStorage.setItem('user_phone_verified', 'true');
      localStorage.setItem('phone_verified_at', new Date().toISOString());
      localStorage.setItem('verification_method', 'Auto-Verified');
      
      setPhoneVerification(prev => ({
        ...prev,
        isVerified: true,
        backendVerified: true
      }));

      // Update state
      setUser(prev => ({
        ...prev,
        name: profileData.name.trim(),
        email: profileData.email.trim().toLowerCase(),
        phoneNo: profileData.phoneNo.trim(),
        phoneVerified: true
      }));

      // Trigger navbar refresh
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user_name',
        newValue: profileData.name.trim(),
      }));

      setSuccessMessage('🎉 Profile updated successfully!');

      // Reset form
      setProfileData(prev => ({ ...prev, photo: null }));

      console.log('✅ Profile update simulated successfully');

    } catch (err) {
      console.error('❌ Profile update error:', err);
      setErrors({ submit: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Submit password update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;

    setIsSubmittingPassword(true);
    setErrors({});
    setSuccessMessage('');

    try {
      console.log('🔐 Simulating password update...');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccessMessage('🎉 Password updated successfully!');

      // Reset password form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
      });

      console.log('✅ Password update simulated successfully');

    } catch (err) {
      console.error('❌ Password update error:', err);
      setErrors({ submit: 'Failed to update password. Please try again.' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Simple loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={profileImage}
                alt={user?.name || 'User'}
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                onError={(e) => { e.target.src = '/default-avatar.png'; }}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                <p className="text-gray-600">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userRole === 'rider' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {userRole === 'rider' ? '🚗' : '🚙'} {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
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

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👤 Profile Information
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔐 Change Password
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Update Profile Information</h3>
                  
                  {/* Profile Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-6">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                      <div>
                        <input
                          id="photo"
                          name="photo"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                        <label
                          htmlFor="photo"
                          className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Change Photo
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, PNG, GIF up to 5MB
                        </p>
                        {errors.photo && (
                          <p className="mt-1 text-sm text-red-600">{errors.photo}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone Number - Always shows as verified */}
                  <div>
                    <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="tel"
                        name="phoneNo"
                        id="phoneNo"
                        value={profileData.phoneNo}
                        onChange={handleProfileChange}
                        className={`flex-1 min-w-0 block w-full border rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          errors.phoneNo ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="+91 1234567890"
                      />
                      <div className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-r-md text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Verified</span>
                      </div>
                    </div>

                    {errors.phoneNo && (
                      <p className="mt-1 text-sm text-red-600">{errors.phoneNo}</p>
                    )}

                    <div className="mt-2 flex items-center text-sm">
                      <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600 font-medium">Phone number automatically verified</span>
                      <span className="ml-2 text-gray-500 text-xs">• Auto-Verified</span>
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
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingProfile}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingProfile ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating Profile...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your current password"
                    />
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your new password"
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Must contain uppercase, lowercase, and number (min 6 characters)
                    </p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="newPasswordConfirm"
                      id="newPasswordConfirm"
                      value={passwordData.newPasswordConfirm}
                      onChange={handlePasswordChange}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.newPasswordConfirm ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your new password"
                    />
                    {errors.newPasswordConfirm && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPasswordConfirm}</p>
                    )}
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
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingPassword}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingPassword ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating Password...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>

        {/* Account Information - Always shows verified */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Account Type:</span>
              <span className="ml-2 text-gray-600">
                {userRole === 'rider' ? '🚗 Rider Account' : '🚙 Driver Account'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Member Since:</span>
              <span className="ml-2 text-gray-600">September 2025</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Account Status:</span>
              <span className="ml-2 text-green-600">✅ Active</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone Verified:</span>
              <span className="ml-2 font-medium text-green-600">✅ Auto-Verified</span>
              <span className="ml-1 text-xs text-gray-500">Always Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
