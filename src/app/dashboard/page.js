// src/app/dashboard/page.js - FIXED: Display calculatedAmount instead of userTotalAmountSpent
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userData, setUserData] = useState({ name: '', image: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard state - Real-time backend data
  const [activeTab, setActiveTab] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalSpent: 0, // This will store the calculated amount from trips
    totalEarned: 0, // This will store the calculated amount from trips
    userTotalTrips: 0,
    userTotalAmountSpent: 0,
    userTotalEarned: 0,
    userCompletedRides: 0
  });
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Helper function to safely extract duration
  const formatDuration = useCallback((duration) => {
    if (!duration) return 'N/A';
    
    if (typeof duration === 'object') {
      const actualDuration = duration.actualDuration || duration.estimatedDuration;
      if (actualDuration) {
        if (typeof actualDuration === 'number') {
          return `${actualDuration} min`;
        }
        if (typeof actualDuration === 'string') {
          return actualDuration;
        }
      }
      
      if (duration.estimatedDuration) {
        if (typeof duration.estimatedDuration === 'number') {
          return `${duration.estimatedDuration} min`;
        }
        return duration.estimatedDuration;
      }
      
      return 'N/A';
    }
    
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number') return `${duration} min`;
    
    return 'N/A';
  }, []);

  // Helper function to safely format distance
  const formatDistance = useCallback((distance) => {
    if (!distance) return 'N/A';
    if (typeof distance === 'number') return `${distance} km`;
    if (typeof distance === 'string') return distance.includes('km') ? distance : `${distance} km`;
    return 'N/A';
  }, []);

  // Helper function to safely format rating
  const formatRating = useCallback((rating) => {
    if (!rating) return '4.5';
    if (typeof rating === 'number') return rating.toFixed(1);
    if (typeof rating === 'string') return rating;
    return '4.5';
  }, []);

  // FETCH REAL-TIME USER PROFILE DATA
  const fetchUserProfile = useCallback(async (token, userRole) => {
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/${userRole}/Me`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const user = data.data.user || data.data;
        
        setStatistics(prev => ({
          ...prev,
          userTotalTrips: user.totalTrips || 0,
          userTotalAmountSpent: user.totalAmountSpent || 0,
          userTotalEarned: user.totalEarned || 0,
          userCompletedRides: user.completedRides || user.totalTrips || 0
        }));

        setUserData(prevData => ({
          ...prevData,
          name: user.name || prevData.name,
          email: user.email || prevData.email,
          image: user.photo || user.image || prevData.image
        }));

        return user;
      }
    } catch (error) {
      return null;
    }
  }, []);

  // FETCH TRIPS FROM BACKEND (Works for both riders and drivers)
  const fetchTrips = useCallback(async (role, token) => {
    try {
      const endpoint = role === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips?rider=true`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips?driver=true`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trips: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const tripsData = data.data.trips || data.data || [];
        setTrips(tripsData);
        
        const totalTrips = tripsData.length;
        const completedTrips = tripsData.filter(trip => 
          trip.status === 'completed' || trip.paymentStatus === 'paid'
        ).length;
        
        let calculatedAmount = 0;
        if (role === 'rider') {
          calculatedAmount = tripsData
            .filter(trip => trip.status === 'completed' || trip.paymentStatus === 'paid')
            .reduce((sum, trip) => {
              const amount = trip.fare?.totalFare || trip.totalAmount || trip.amount || 0;
              return sum + amount;
            }, 0);
        } else {
          calculatedAmount = tripsData
            .filter(trip => trip.status === 'completed' || trip.paymentStatus === 'paid')
            .reduce((sum, trip) => {
              const totalAmount = trip.fare?.totalFare || trip.totalAmount || trip.amount || 0;
              const driverEarning = trip.driverEarning || (totalAmount * 0.8) || 0;
              return sum + driverEarning;
            }, 0);
        }

        setStatistics(prev => ({
          ...prev,
          totalTrips,
          completedTrips,
          [role === 'rider' ? 'totalSpent' : 'totalEarned']: calculatedAmount
        }));

        return tripsData;
      }
    } catch (error) {
      return [];
    }
  }, []);

  // FETCH PAYMENTS FROM BACKEND
  const fetchPayments = useCallback(async (role, token) => {
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/payment/history`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const paymentsData = data.data.payments || data.data || [];
        setPayments(paymentsData);
        return paymentsData;
      }
    } catch (error) {
      return [];
    }
  }, []);

  // LOAD ALL DATA FROM BACKEND - ONLY CALLED ONCE OR ON REFRESH
  const loadDashboardData = useCallback(async (role, token) => {
    setIsDataLoading(true);
    try {
      await fetchUserProfile(token, role);

      const [tripsData, paymentsData] = await Promise.all([
        fetchTrips(role, token),
        fetchPayments(role, token)
      ]);

    } catch (error) {
      // Error handled silently
    } finally {
      setIsDataLoading(false);
    }
  }, [fetchUserProfile, fetchTrips, fetchPayments]);

  // REFRESH DATA FUNCTION - ONLY CALLED ON BUTTON CLICK
  const refreshDashboardData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    
    if (token && role) {
      await loadDashboardData(role, token);
    }
  }, [loadDashboardData]);

  // FIXED: Check authentication and load data ONLY ONCE
  useEffect(() => {
    let mounted = true;

    const checkAuthAndLoadData = async () => {
      if (typeof window !== 'undefined') {
        const isLoggedIn = localStorage.getItem('isUserLoggedIn') === 'true';
        const role = localStorage.getItem('user_role');
        const name = localStorage.getItem('user_name');
        const email = localStorage.getItem('user_email');
        const image = localStorage.getItem('user_image');
        const token = localStorage.getItem('access_token');

        if (isLoggedIn && role && name && token) {
          if (mounted) {
            setIsAuthenticated(true);
            setUserRole(role);
            setUserData({
              name: name || 'User',
              email: email || '',
              image: image || '/default-avatar.png'
            });

            // Load data only once on mount
            await loadDashboardData(role, token);
          }
        } else {
          router.push('/authentication/login');
          return;
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();

    return () => {
      mounted = false;
    };
  }, [router, loadDashboardData]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // UPDATED: Sidebar navigation items - REMOVED wallet
  const sidebarItems = [
    {
      id: 'trips',
      name: userRole === 'rider' ? 'Your Trips' : 'Your Rides',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      available: true
    },
    {
      id: 'payments',
      name: userRole === 'rider' ? 'Your Payments' : 'Payment History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      available: true
    },
    {
      id: 'earnings',
      name: 'Your Earnings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      available: userRole === 'driver'
    },
    {
      id: 'support',
      name: 'Help & Support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 110 19.5 9.75 9.75 0 010-19.5z" />
        </svg>
      ),
      available: true
    }
  ];

  // Filter available sidebar items
  const availableSidebarItems = sidebarItems.filter(item => item.available);

  // Trip status color helper
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'ongoing':
      case 'in-progress':
      case 'active':
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format time helper
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

  // UPDATED: Render trip card for riders with backend data
  const renderRiderTripCard = (trip) => (
    <div key={trip._id || trip.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
              {trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Unknown'}
            </span>
            <span className="text-sm text-gray-500">
              {formatDate(trip.createdAt || trip.bookingTime)} • {formatTime(trip.createdAt || trip.bookingTime)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">From:</span>
              <span className="ml-1 text-gray-700">
                {trip.pickupLocation?.address || trip.pickupLocation || trip.from || 'N/A'}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="font-medium">To:</span>
              <span className="ml-1 text-gray-700">
                {trip.dropoffLocation?.address || trip.dropoffLocation || trip.to || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">
            ₹{trip.fare?.totalFare || trip.totalAmount || trip.amount || 0}
          </div>
          <div className="text-sm text-gray-500">
            {formatDistance(trip.distance)} • {formatDuration(trip.duration || trip.estimatedTime)}
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-sm">
                {userRole === 'rider' 
                  ? (trip.driverId?.name || trip.driver?.name || trip.driverName || 'Driver')
                  : (trip.riderId?.name || trip.rider?.name || trip.riderName || 'Rider')
                }
              </div>
              <div className="text-xs text-gray-500">
                {trip.vehicleType || trip.vehicle?.type || 'Vehicle'} • {trip.vehicleNumber || trip.vehicle?.plateNumber || 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium">
              {formatRating(
                userRole === 'rider' 
                  ? (trip.driverId?.averageRating || trip.driver?.rating || trip.driverRating)
                  : (trip.riderId?.averageRating || trip.rider?.rating || trip.riderRating)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // UPDATED: Render content with real backend data - FIXED: Use calculated amounts
  const renderTabContent = () => {
    switch (activeTab) {
      case 'trips':
        return (
          <div>
            {isDataLoading && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-700">Loading latest data from backend...</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userRole === 'rider' ? 'Your Trips' : 'Your Rides'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {userRole === 'rider' ? 'View and manage your recent trips' : 'View and manage your recent rides'}
                </p>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={refreshDashboardData}
                  disabled={isDataLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                >
                  <svg className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>All {userRole === 'rider' ? 'Trips' : 'Rides'}</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            {/* FIXED: Display calculated amounts from trips data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total {userRole === 'rider' ? 'Trips' : 'Rides'}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {statistics.totalTrips || 0}
                    </p>
                    <p className="text-xs text-blue-500">From trips data</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Completed</p>
                    <p className="text-2xl font-bold text-green-900">{statistics.completedTrips || 0}</p>
                    <p className="text-xs text-green-500">From trips data</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      {userRole === 'rider' ? 'Total Spent' : 'Total Earned'}
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      ₹{userRole === 'rider' 
                        ? (statistics.totalSpent || 0)
                        : (statistics.totalEarned || 0)
                      }
                    </p>
                    <p className="text-xs text-purple-500">Calculated from trips</p>
                  </div>
                </div>
              </div>
            </div>

            {/* UPDATED: All User Trips from backend */}
            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map(trip => renderRiderTripCard(trip))
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No {userRole === 'rider' ? 'trips' : 'rides'} yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {userRole === 'rider' 
                      ? 'Start your journey with RideFlex Pro' 
                      : 'Start earning with RideFlex Pro'
                    }
                  </p>
                  {userRole === 'rider' && (
                    <Link 
                      href="/rider/book-ride" 
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Book Your First Ride
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'payments':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userRole === 'rider' ? 'Your Payments' : 'Payment History'}
                </h2>
                <p className="text-gray-600 mt-1">Transaction history and payment methods</p>
              </div>
              <button 
                onClick={refreshDashboardData}
                disabled={isDataLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {/* FIXED: Real-time Payment Summary - Display calculated amounts */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">
                      {userRole === 'rider' ? 'Total Spent' : 'Total Earned'}
                    </p>
                    <p className="text-3xl font-bold">
                      ₹{userRole === 'rider' 
                        ? (statistics.totalSpent || 0)
                        : (statistics.totalEarned || 0)
                      }
                    </p>
                    <p className="text-sm text-green-100">Calculated from trips</p>
                  </div>
                  <div className="p-3 bg-green-400 bg-opacity-50 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              </div>
              
              {payments.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {payments.map(payment => (
                    <div key={payment._id || payment.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          payment.status === 'paid' ? 'bg-green-100' : 
                          payment.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            payment.status === 'paid' ? 'text-green-600' : 
                            payment.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {userRole === 'rider' ? 'Trip Payment' : 'Trip Earning'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.paymentMethod || 'Stripe'} • {formatDate(payment.createdAt || payment.completedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {userRole === 'rider' ? '-' : '+'}₹{payment.amount}
                        </div>
                        <div className={`text-xs ${
                          payment.status === 'paid' ? 'text-green-600' : 
                          payment.status === 'pending' ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-sm">No payment transactions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your payment history will appear here</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'earnings':
        return userRole === 'driver' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Earnings</h2>
                <p className="text-gray-600 mt-1">Track your driving income and performance</p>
              </div>
              <button 
                onClick={refreshDashboardData}
                disabled={isDataLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <svg className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {/* FIXED: Driver Earnings Summary - Display calculated amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-900">
                      ₹{statistics.totalEarned || 0}
                    </p>
                    <p className="text-xs text-green-500">Calculated from trips</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Average per Trip</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      ₹{statistics.totalTrips > 0 
                        ? Math.round((statistics.totalEarned || 0) / statistics.totalTrips)
                        : 0
                      }
                    </p>
                    <p className="text-xs text-yellow-500">Per completed ride</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder for earnings chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings Overview</h3>
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">Detailed earnings analytics coming soon</p>
                <p className="text-xs text-gray-400 mt-1">Track your income trends and performance metrics</p>
              </div>
            </div>
          </div>
        ) : null;

      case 'support':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Help & Support</h2>
                <p className="text-gray-600 mt-1">Get help and contact our support team</p>
              </div>
            </div>

            {/* Support options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">Live Chat</h3>
                    <p className="text-sm text-gray-500">Chat with our support team</p>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Start Chat
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">Email Support</h3>
                    <p className="text-sm text-gray-500">Send us an email</p>
                  </div>
                </div>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  Send Email
                </button>
              </div>
            </div>

            {/* FAQ placeholder */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">FAQ section coming soon</p>
                <p className="text-xs text-gray-400 mt-1">Common questions and answers will be available here</p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Content not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img
                src={userData.image}
                alt={userData.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                onError={(e) => { e.target.src = '/default-avatar.png'; }}
              />
              <div>
                <h2 className="font-semibold text-gray-900">{userData.name}</h2>
                <p className="text-sm text-gray-500 capitalize">{userRole}</p>
                <div className="flex items-center mt-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-2">
              {availableSidebarItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <Link
              href="/profile/settings"
              className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Profile Settings</span>
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
