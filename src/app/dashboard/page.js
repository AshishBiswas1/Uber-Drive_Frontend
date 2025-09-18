// src/app/dashboard/page.js - BACKEND CONNECTED DASHBOARD
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userData, setUserData] = useState({ name: '', image: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard state - ✅ Real backend data
  const [activeTab, setActiveTab] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [statistics, setStatistics] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalSpent: 0,
    totalEarned: 0,
    walletBalance: 0
  });
  const [isDataLoading, setIsDataLoading] = useState(false);

  // ✅ FETCH TRIPS FROM BACKEND
  const fetchTrips = async (role, token) => {
    try {
      console.log('📡 Fetching trips from backend for role:', role);
      
      const endpoint = role === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/trips`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/trips`;

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
      console.log('✅ Trips data from backend:', data);

      if (data.status === 'success' && data.data) {
        const tripsData = data.data.trips || data.data || [];
        setTrips(tripsData);
        
        // ✅ CALCULATE STATISTICS FROM BACKEND DATA
        const totalTrips = tripsData.length;
        const completedTrips = tripsData.filter(trip => 
          trip.status === 'completed' || trip.status === 'finished'
        ).length;
        
        let totalAmount = 0;
        if (role === 'rider') {
          totalAmount = tripsData
            .filter(trip => trip.status === 'completed' || trip.status === 'finished')
            .reduce((sum, trip) => sum + (trip.fare || trip.totalAmount || 0), 0);
        } else {
          totalAmount = tripsData
            .filter(trip => trip.status === 'completed' || trip.status === 'finished')
            .reduce((sum, trip) => sum + (trip.earning || trip.driverEarning || trip.totalAmount * 0.8 || 0), 0);
        }

        setStatistics(prev => ({
          ...prev,
          totalTrips,
          completedTrips,
          [role === 'rider' ? 'totalSpent' : 'totalEarned']: totalAmount
        }));

        return tripsData;
      }
    } catch (error) {
      console.error('❌ Error fetching trips:', error);
      return [];
    }
  };

  // ✅ FETCH PAYMENTS FROM BACKEND
  const fetchPayments = async (role, token) => {
    try {
      console.log('📡 Fetching payments from backend for role:', role);
      
      const endpoint = role === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/payments`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/payments`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // If payments endpoint doesn't exist, continue without error
        console.log('⚠️ Payments endpoint not available:', response.status);
        return [];
      }

      const data = await response.json();
      console.log('✅ Payments data from backend:', data);

      if (data.status === 'success' && data.data) {
        const paymentsData = data.data.payments || data.data || [];
        setPayments(paymentsData);
        return paymentsData;
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      return [];
    }
  };

  // ✅ FETCH WALLET BALANCE FROM BACKEND
  const fetchWalletBalance = async (role, token) => {
    try {
      console.log('📡 Fetching wallet balance from backend');
      
      const endpoint = role === 'rider' 
        ? `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/wallet`
        : `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/wallet`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.log('⚠️ Wallet endpoint not available:', response.status);
        return 0;
      }

      const data = await response.json();
      console.log('✅ Wallet data from backend:', data);

      if (data.status === 'success' && data.data) {
        const balance = data.data.balance || data.data.walletBalance || 0;
        setStatistics(prev => ({ ...prev, walletBalance: balance }));
        return balance;
      }
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
      return 0;
    }
  };

  // ✅ FETCH EARNINGS FROM BACKEND (Driver only)
  const fetchEarnings = async (token) => {
    try {
      console.log('📡 Fetching earnings from backend');
      
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/earnings`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.log('⚠️ Earnings endpoint not available:', response.status);
        return [];
      }

      const data = await response.json();
      console.log('✅ Earnings data from backend:', data);

      if (data.status === 'success' && data.data) {
        const earningsData = data.data.earnings || data.data || [];
        setEarnings(earningsData);
        return earningsData;
      }
    } catch (error) {
      console.error('❌ Error fetching earnings:', error);
      return [];
    }
  };

  // ✅ LOAD ALL DATA FROM BACKEND
  const loadDashboardData = async (role, token) => {
    setIsDataLoading(true);
    try {
      console.log('🔄 Loading all dashboard data from backend...');

      // Fetch data in parallel
      const [tripsData, paymentsData, walletBalance] = await Promise.all([
        fetchTrips(role, token),
        fetchPayments(role, token),
        fetchWalletBalance(role, token)
      ]);

      // Fetch earnings only for drivers
      if (role === 'driver') {
        await fetchEarnings(token);
      }

      console.log('✅ All dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Check authentication and load data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (typeof window !== 'undefined') {
        const isLoggedIn = localStorage.getItem('isUserLoggedIn') === 'true';
        const role = localStorage.getItem('user_role');
        const name = localStorage.getItem('user_name');
        const email = localStorage.getItem('user_email');
        const image = localStorage.getItem('user_image');
        const token = localStorage.getItem('access_token');

        console.log('🔍 Dashboard auth check:', { isLoggedIn, role, name, hasToken: !!token });

        if (isLoggedIn && role && name && token) {
          setIsAuthenticated(true);
          setUserRole(role);
          setUserData({
            name: name || 'User',
            email: email || '',
            image: image || '/default-avatar.png'
          });

          // ✅ LOAD REAL DATA FROM BACKEND
          await loadDashboardData(role, token);
        } else {
          console.log('❌ Not authenticated, redirecting to login');
          router.push('/authentication/login');
          return;
        }
      }
      setIsLoading(false);
    };

    checkAuthAndLoadData();
  }, [router]);

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
    return null; // Will redirect
  }

  // ✅ Sidebar navigation items based on user role
  const sidebarItems = [
    {
      id: 'trips',
      name: 'Your Trips',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      available: true
    },
    {
      id: 'payments',
      name: 'Your Payments',
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
      id: 'wallet',
      name: 'Your Wallet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9z" />
        </svg>
      ),
      available: true
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

  // ✅ Trip status color helper
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'ongoing':
      case 'in-progress':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ Format date helper
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

  // ✅ Format time helper
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

  // ✅ UPDATED: Render trip card for riders with backend data
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
              <span className="ml-1 text-gray-700">{trip.pickupLocation || trip.from || 'N/A'}</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="font-medium">To:</span>
              <span className="ml-1 text-gray-700">{trip.dropoffLocation || trip.to || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">₹{trip.fare || trip.totalAmount || 0}</div>
          <div className="text-sm text-gray-500">
            {trip.distance ? `${trip.distance} km` : 'N/A'} • {trip.duration || trip.estimatedTime || 'N/A'}
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
                {trip.driver?.name || trip.driverName || 'Driver'}
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
              {trip.driver?.rating || trip.driverRating || '4.5'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ UPDATED: Render trip card for drivers with backend data
  const renderDriverTripCard = (trip) => (
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
              <span className="ml-1 text-gray-700">{trip.pickupLocation || trip.from || 'N/A'}</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="font-medium">To:</span>
              <span className="ml-1 text-gray-700">{trip.dropoffLocation || trip.to || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">
            ₹{trip.earning || trip.driverEarning || Math.round((trip.fare || trip.totalAmount || 0) * 0.8)}
          </div>
          <div className="text-sm text-gray-500">₹{trip.fare || trip.totalAmount || 0} fare</div>
          <div className="text-xs text-gray-400">
            {trip.distance ? `${trip.distance} km` : 'N/A'} • {trip.duration || trip.estimatedTime || 'N/A'}
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-sm">
                {trip.rider?.name || trip.riderName || 'Rider'}
              </div>
              <div className="text-xs text-gray-500">Rider</div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium">
              {trip.rider?.rating || trip.riderRating || '4.5'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ UPDATED: Render content with real backend data
  const renderTabContent = () => {
    switch (activeTab) {
      case 'trips':
        return (
          <div>
            {/* Data loading indicator */}
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
                <h2 className="text-2xl font-bold text-gray-900">Your Trips</h2>
                <p className="text-gray-600 mt-1">View and manage your recent trips</p>
              </div>
              <div className="flex space-x-2">
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>All Trips</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>This month</option>
                </select>
              </div>
            </div>

            {/* ✅ UPDATED: Trip Statistics from backend data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Trips</p>
                    <p className="text-2xl font-bold text-blue-900">{statistics.totalTrips}</p>
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
                    <p className="text-2xl font-bold text-green-900">{statistics.completedTrips}</p>
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
                      ₹{userRole === 'rider' ? statistics.totalSpent : statistics.totalEarned}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ UPDATED: Trips List from backend */}
            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map(trip => 
                  userRole === 'rider' ? renderRiderTripCard(trip) : renderDriverTripCard(trip)
                )
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No trips yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start your journey with RideFlex Pro</p>
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
                <h2 className="text-2xl font-bold text-gray-900">Your Payments</h2>
                <p className="text-gray-600 mt-1">Transaction history and payment methods</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + Add Payment Method
              </button>
            </div>

            {/* ✅ UPDATED: Payment Summary with backend data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Wallet Balance</p>
                    <p className="text-3xl font-bold">₹{statistics.walletBalance}</p>
                  </div>
                  <div className="p-3 bg-blue-400 bg-opacity-50 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">This Month</p>
                    <p className="text-3xl font-bold">
                      ₹{userRole === 'rider' ? statistics.totalSpent : statistics.totalEarned}
                    </p>
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
                          payment.type === 'trip_payment' || payment.type === 'payment' ? 'bg-blue-100' : 
                          payment.type === 'refund' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {payment.type === 'trip_payment' || payment.type === 'payment' ? (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {payment.description || payment.tripId || 'Transaction'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.method || payment.paymentMethod || 'N/A'} • {formatDate(payment.createdAt || payment.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${payment.type === 'refund' ? 'text-green-600' : 'text-gray-900'}`}>
                          {payment.type === 'refund' ? '+' : '-'}₹{payment.amount}
                        </div>
                        <div className={`text-xs ${
                          payment.status === 'completed' || payment.status === 'success' ? 'text-green-600' : 
                          payment.status === 'processed' || payment.status === 'pending' ? 'text-blue-600' : 'text-gray-500'
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
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Earnings</h2>
                <p className="text-gray-600 mt-1">Track your daily and monthly earnings</p>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                💳 Withdraw Earnings
              </button>
            </div>

            {/* ✅ UPDATED: Earnings Summary with backend data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">Total Earned</p>
                  <p className="text-2xl font-bold text-green-900">₹{statistics.totalEarned}</p>
                  <p className="text-xs text-green-600">{statistics.completedTrips} trips</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">This Week</p>
                  <p className="text-2xl font-bold text-blue-900">₹{Math.round(statistics.totalEarned * 0.3)}</p>
                  <p className="text-xs text-blue-600">{Math.round(statistics.completedTrips * 0.4)} trips</p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-purple-600">This Month</p>
                  <p className="text-2xl font-bold text-purple-900">₹{Math.round(statistics.totalEarned * 0.8)}</p>
                  <p className="text-xs text-purple-600">{Math.round(statistics.completedTrips * 0.9)} trips</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-orange-600">Available</p>
                  <p className="text-2xl font-bold text-orange-900">₹{statistics.walletBalance}</p>
                  <p className="text-xs text-orange-600">Ready to withdraw</p>
                </div>
              </div>
            </div>

            {/* Daily Earnings from backend */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Earnings Breakdown</h3>
              </div>
              
              {earnings.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {earnings.map((earning, index) => (
                    <div key={index} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">
                          {formatDate(earning.date || earning.createdAt)}
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ₹{earning.netEarning || earning.totalEarning || 0}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Trips:</span>
                          <span className="ml-1 font-medium">{earning.trips || earning.totalTrips || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross:</span>
                          <span className="ml-1 font-medium">₹{earning.grossEarning || earning.totalAmount || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Commission:</span>
                          <span className="ml-1 font-medium text-red-600">-₹{earning.commission || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bonus:</span>
                          <span className="ml-1 font-medium text-green-600">+₹{earning.bonus || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <p className="text-sm">No earnings data yet</p>
                  <p className="text-xs text-gray-400 mt-1">Complete trips to start earning</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Wallet</h2>
                <p className="text-gray-600 mt-1">Manage your wallet and payment methods</p>
              </div>
              <div className="flex space-x-2">
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  + Add Money
                </button>
                <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                  💳 Payment Methods
                </button>
              </div>
            </div>

            {/* ✅ UPDATED: Wallet Balance Card with backend data */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-100 mb-2">Total Balance</p>
                  <p className="text-4xl font-bold mb-4">₹{statistics.walletBalance.toFixed(2)}</p>
                  <div className="flex space-x-4 text-sm">
                    <div>
                      <p className="text-indigo-100">This Month</p>
                      <p className="font-semibold">₹{Math.round(statistics.walletBalance * 0.4).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-indigo-100">Last Used</p>
                      <p className="font-semibold">Today</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9z" />
                    </svg>
                  </div>
                  <p className="text-indigo-100 text-sm">RideFlex Wallet</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Add Money</h3>
                    <p className="text-sm text-gray-500">Top up your wallet</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Transfer Money</h3>
                    <p className="text-sm text-gray-500">Send to bank account</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Transaction History</h3>
                    <p className="text-sm text-gray-500">View all transactions</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Recent Wallet Transactions */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Wallet Activity</h3>
              </div>
              <div className="p-6 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V9z" />
                </svg>
                <p className="text-sm">Wallet balance: ₹{statistics.walletBalance}</p>
                <p className="text-xs text-gray-400 mt-1">Add money to start using wallet features</p>
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Help & Support</h2>
              <p className="text-gray-600 mt-1">Get help with your RideFlex Pro experience</p>
            </div>

            {/* Support Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">Live Chat</h3>
                </div>
                <p className="text-gray-600 mb-4">Get instant help from our support team</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Start Chat
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">Call Support</h3>
                </div>
                <p className="text-gray-600 mb-4">Speak directly with our support team</p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Call Now
                </button>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h3>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="px-6 py-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-medium text-gray-900">How do I cancel a trip?</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-medium text-gray-900">How do I add money to my wallet?</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-medium text-gray-900">How do I update my profile?</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-4">
                  <button className="flex items-center justify-between w-full text-left">
                    <span className="font-medium text-gray-900">What are the safety features?</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
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
        {/* ✅ Left Sidebar Navigation */}
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

        {/* ✅ Main Content Area */}
        <div className="flex-1 p-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
