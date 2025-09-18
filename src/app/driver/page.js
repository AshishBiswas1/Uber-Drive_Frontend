// DriverPage.js - ENHANCED VERSION WITH DYNAMIC ROUTING AND BACKEND STATUS FIX
'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// Load Map component dynamically
const GoogleMap = dynamic(() => import('../../components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center"><p className="text-gray-500">Loading Navigation...</p></div>
});

// Self-contained GPS service
const gpsUtils = {
  clearCache() {
    console.log('🧹 GPS cache cleared');
  },
  
  getAccuracyStatus(accuracy) {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Very Good';
    if (accuracy <= 20) return 'Good';
    if (accuracy <= 50) return 'Fair';
    if (accuracy <= 100) return 'City-level';
    return 'Area-level';
  }
};

// Enhanced backend service with driver status API and ride requests
const driverService = {
  getAuthToken() {
    const tokenSources = [
      () => localStorage.getItem('access_token'),
      () => localStorage.getItem('jwt'),
      () => localStorage.getItem('authToken'),
      () => localStorage.getItem('token'),
      () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'jwt' || name === 'access_token') {
            return decodeURIComponent(value);
          }
        }
        return null;
      }
    ];

    for (const getToken of tokenSources) {
      const token = getToken();
      if (token && token !== 'null' && token !== 'undefined') {
        console.log('🔑 Found auth token from source:', getToken.name || 'cookie');
        return token;
      }
    }

    return null;
  },

  getDriverId() {
    const sources = [
      () => localStorage.getItem('user_id'),
      () => localStorage.getItem('userId'),
      () => {
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          return userData.id || userData._id || userData.userId;
        }
        return null;
      }
    ];

    for (const getSource of sources) {
      const id = getSource();
      if (id && id !== 'null' && id !== 'undefined') {
        return id;
      }
    }
    return null;
  },

  checkDriverPermissions() {
    const userRole = localStorage.getItem('user_role');
    const userId = localStorage.getItem('user_id');
    
    console.log('🔍 Checking driver permissions:', { userRole, userId: userId ? 'present' : 'missing' });
    
    if (userRole !== 'driver') {
      console.warn('⚠️ User role is not "driver":', userRole);
      return false;
    }
    
    if (!userId) {
      console.warn('⚠️ Missing user_id in localStorage');
      return false;
    }
    
    return true;
  },

  async getDriverStatus() {
    try {
      console.log('🔍 Fetching current driver status from backend...');
      
      if (!this.checkDriverPermissions()) {
        throw new Error('PERMISSION_DENIED: User must be a driver to check status');
      }

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/getDriverStatus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch driver status:', errorData);
        throw new Error(`Failed to fetch status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Current driver status fetched:', data);
      
      return { success: true, status: data.status, data };

    } catch (error) {
      console.error('❌ Error fetching driver status:', error);
      return { success: false, error: error.message };
    }
  },

  async setDriverStatus(isOnline) {
    try {
      console.log(`🔄 Setting driver status to: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      if (!this.checkDriverPermissions()) {
        throw new Error('PERMISSION_DENIED: User must be a driver to update status');
      }

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const payload = {
        status: isOnline ? 'online' : 'offline',
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('user_id'),
        source: 'driver_app'
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/setDriverStatus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        console.error('❌ Driver status update failed:', errorData);
        throw new Error(`Status update failed: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Driver status updated successfully:', data);
      
      return { success: true, data };

    } catch (error) {
      console.error('❌ Driver status update failed:', error);
      return { success: false, error: error.message };
    }
  },

  async updateDriverLocation(coordinates) {
    try {
      if (!this.checkDriverPermissions()) {
        throw new Error('PERMISSION_DENIED: User must be a driver to update location');
      }

      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const payload = {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        accuracy: coordinates.accuracy || null,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('user_id'),
        userRole: localStorage.getItem('user_role'),
        source: 'driver_app'
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/driver/setCurrentLocation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(`Location update failed: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Location updated successfully');
      
      return { success: true, data };

    } catch (error) {
      console.error('❌ Location update failed:', error);
      return { success: false, error: error.message };
    }
  },

  async checkForRideRequests() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const driverId = this.getDriverId();
      if (!driverId) {
        throw new Error('DRIVER_ID_MISSING: Driver ID not found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/driver/${driverId}/pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, requests: [] };
        }
        throw new Error(`Failed to fetch ride requests: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Pending ride requests:', data);
      
      return { 
        success: true, 
        requests: data.data?.trips || data.trips || [] 
      };

    } catch (error) {
      console.error('❌ Error checking ride requests:', error);
      return { success: false, error: error.message, requests: [] };
    }
  },

  async acceptRideRequest(tripId) {
    try {
      console.log('✅ Accepting ride request:', tripId);
      
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const driverId = this.getDriverId();
      if (!driverId) {
        throw new Error('DRIVER_ID_MISSING: Driver ID not found');
      }

      const payload = {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        driverId: driverId,
        userId: localStorage.getItem('user_id'),
        userRole: localStorage.getItem('user_role'),
        timestamp: new Date().toISOString(),
        source: 'driver_app'
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token,
        'x-access-token': token,
        'x-user-id': driverId,
        'x-user-role': 'driver',
        'x-driver-id': driverId
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/${tripId}/accept`, {
        method: 'PATCH',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { 
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            statusText: response.statusText
          };
        }

        if (response.status === 403) {
          if (localStorage.getItem('user_role') !== 'driver') {
            throw new Error('ROLE_MISMATCH: User is not logged in as a driver. Please login as a driver.');
          }
          
          if (!driverId) {
            throw new Error('MISSING_DRIVER_ID: Driver ID not found in localStorage. Please re-login.');
          }
          
          throw new Error(`AUTHORIZATION_DENIED: ${errorData.message || 'Not authorized to accept this trip'}. Please check if you are properly logged in as a driver.`);
        }
        
        if (response.status === 404) {
          throw new Error('TRIP_NOT_FOUND: This trip may have been cancelled or already accepted by another driver.');
        }
        
        if (response.status === 409) {
          throw new Error('TRIP_CONFLICT: This trip has already been accepted by another driver or is no longer available.');
        }

        throw new Error(`Failed to accept ride: ${errorData.message || response.statusText} (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Ride request accepted successfully');
      
      return { success: true, trip: data.data?.trip || data.trip };

    } catch (error) {
      console.error('❌ Error accepting ride request:', error);
      
      let userFriendlyMessage = error.message;
      
      if (error.message.includes('AUTHORIZATION_DENIED')) {
        userFriendlyMessage = 'Authorization failed. Please logout and login again as a driver.';
      } else if (error.message.includes('ROLE_MISMATCH')) {
        userFriendlyMessage = 'Please login as a driver to accept rides.';
      } else if (error.message.includes('TRIP_NOT_FOUND')) {
        userFriendlyMessage = 'This trip is no longer available.';
      } else if (error.message.includes('TRIP_CONFLICT')) {
        userFriendlyMessage = 'This trip has already been accepted by another driver.';
      } else if (error.message.includes('AUTH_TOKEN_MISSING')) {
        userFriendlyMessage = 'Session expired. Please login again.';
      }
      
      return { 
        success: false, 
        error: error.message,
        userMessage: userFriendlyMessage
      };
    }
  },

  async rejectRideRequest(tripId, reason = 'Driver declined') {
    try {
      console.log('❌ Rejecting ride request:', tripId);
      
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('AUTH_TOKEN_MISSING: No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/${tripId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'cancelled_by_driver',
          rejectedAt: new Date().toISOString(),
          reason: reason
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(`Failed to reject ride: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Ride request rejected successfully:', data);
      
      return { success: true, trip: data.data?.trip || data.trip };

    } catch (error) {
      console.error('❌ Error rejecting ride request:', error);
      return { success: false, error: error.message };
    }
  }
};

// ✨ ENHANCED: Trip Route Overview Component (shows when driver arrives)
function TripRouteOverviewCard({ trip, driverLocation, onStartTrip, onCompleteTrip }) {
  const [overviewTimer, setOverviewTimer] = useState(0);

  useEffect(() => {
    if (!trip?.arrivedAt) return;

    const startTime = new Date(trip.arrivedAt);
    const updateTimer = () => {
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setOverviewTimer(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [trip?.arrivedAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotalDistance = () => {
    let total = parseFloat(trip?.distance) || 0;
    if (trip?.stops && trip.stops.length > 0) {
      total += trip.stops.length * 2;
    }
    return total.toFixed(1);
  };

  const estimateTotalDuration = () => {
    let baseDuration = parseFloat(trip?.duration?.estimatedDuration) || 30;
    if (trip?.stops && trip.stops.length > 0) {
      baseDuration += trip.stops.length * 5;
    }
    return Math.ceil(baseDuration);
  };

  return (
    <div className="space-y-4">
      {/* Route Overview Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
              ✅
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-green-800">
            Arrived at Pickup
          </h3>
          
          <p className="text-sm text-green-700 mb-2">
            🗺️ Review complete trip route below
          </p>

          <p className="text-xs text-green-600">
            Waiting time: {formatTime(overviewTimer)}
          </p>
        </div>
      </div>

      {/* Complete Trip Route Summary */}
      <div className="bg-white rounded-lg p-5 border-2 border-blue-200 shadow-sm">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
          🗺️ Complete Trip Overview
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {trip?.stops && trip.stops.length > 0 ? `${trip.stops.length + 2} locations` : '2 locations'}
          </span>
        </h4>

        {/* Route Steps */}
        <div className="space-y-3 mb-4">
          {/* Start - Pickup */}
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">START - PICKUP</p>
              <p className="font-medium text-sm text-gray-800">{trip?.pickupLocation?.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600 font-medium">✅ Current</p>
            </div>
          </div>

          {/* Stops */}
          {trip?.stops && trip.stops.map((stop, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mt-1 flex-shrink-0 relative">
                <span className="absolute -top-1 -right-1 text-xs font-bold text-yellow-700">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">STOP {index + 1}</p>
                <p className="font-medium text-sm text-gray-800">{stop.address}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-yellow-600 font-medium">~{5 + index * 2} min</p>
              </div>
            </div>
          ))}

          {/* End - Destination */}
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">END - DESTINATION</p>
              <p className="font-medium text-sm text-gray-800">{trip?.dropoffLocation?.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-600 font-medium">~{estimateTotalDuration()} min</p>
            </div>
          </div>
        </div>

        {/* Trip Statistics */}
        <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">Total Distance</p>
            <p className="font-bold text-lg text-gray-800">{calculateTotalDistance()}</p>
            <p className="text-xs text-gray-600">km</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Est. Duration</p>
            <p className="font-bold text-lg text-gray-800">{estimateTotalDuration()}</p>
            <p className="text-xs text-gray-600">minutes</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Trip Fare</p>
            <p className="font-bold text-lg text-green-600">₹{trip?.fare?.totalFare}</p>
            <p className="text-xs text-gray-600">total</p>
          </div>
        </div>
      </div>

      {/* Trip Control Actions */}
      <div className="space-y-3">
        {/* ✅ FIXED: Check for both frontend and backend status values */}
        {(trip?.status === 'arrived' || trip?.status === 'trip_arrived') ? (
          <button
            onClick={onStartTrip}
            className="w-full bg-blue-600 text-white px-4 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            🚗 Start Complete Trip
          </button>
        ) : (
          <button
            onClick={onCompleteTrip}
            className="w-full bg-green-600 text-white px-4 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
          >
            ✅ Complete Trip
          </button>
        )}

        <button
          onClick={() => window.open(`tel:${trip?.riderId?.phoneNo || 'emergency'}`, '_self')}
          className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
        >
          📞 Contact Rider
        </button>

        <div className="bg-gray-50 rounded-lg p-3">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              📋 View Trip Details
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Trip ID:</span>
                <span className="font-mono">{trip?._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vehicle Type:</span>
                <span className="font-medium">{trip?.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span>Requested:</span>
                <span>{new Date(trip?.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Accepted:</span>
                <span>{new Date(trip?.acceptedAt).toLocaleTimeString()}</span>
              </div>
              {trip?.arrivedAt && (
                <div className="flex justify-between">
                  <span>Arrived:</span>
                  <span>{new Date(trip.arrivedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ✨ ENHANCED: Active Trip Component with Navigation Stages and Backend Status Support
function ActiveTripCard({ trip, driverLocation, onCompleteTrip, onUpdateStatus }) {
  const [tripTimer, setTripTimer] = useState(0);

  useEffect(() => {
    if (!trip?.acceptedAt) return;

    const startTime = new Date(trip.acceptedAt);
    const updateTimer = () => {
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000);
      setTripTimer(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [trip?.acceptedAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ FIXED: Check for both frontend and backend status values
  if (trip?.status === 'arrived' || trip?.status === 'trip_arrived') {
    return (
      <TripRouteOverviewCard
        trip={trip}
        driverLocation={driverLocation}
        onStartTrip={() => onUpdateStatus('started')}
        onCompleteTrip={onCompleteTrip}
      />
    );
  }

  // ✅ ENHANCED: Handle backend status values in getStatusColor
  const getStatusColor = () => {
    const normalizedStatus = trip?.status?.toLowerCase();
    switch (normalizedStatus) {
      case 'accepted':
      case 'trip_accepted':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'started':
      case 'trip_started':  // ✅ FIXED: Handle backend status
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // ✅ ENHANCED: Handle backend status values in getStatusMessage
  const getStatusMessage = () => {
    const normalizedStatus = trip?.status?.toLowerCase();
    switch (normalizedStatus) {
      case 'accepted':
      case 'trip_accepted':
        return '🚗 Navigate to pickup location';
      case 'started':
      case 'trip_started':  // ✅ FIXED: Handle backend status
        return '🎯 Trip in progress - navigate to destination';
      case 'arrived':
      case 'trip_arrived':
        return '📍 Arrived at pickup - ready to start trip';
      default:
        return `Trip status: ${trip?.status || 'unknown'}`;
    }
  };

  // ✅ ENHANCED: Handle backend status values in getNavigationInfo  
  const getNavigationInfo = () => {
    const normalizedStatus = trip?.status?.toLowerCase();
    switch (normalizedStatus) {
      case 'accepted':
      case 'trip_accepted':
        return {
          destination: trip?.pickupLocation?.address,
          icon: '📍',
          color: 'text-blue-600',
          label: 'Navigate to'
        };
      case 'started':
      case 'trip_started':  // ✅ FIXED: Handle backend status
        return {
          destination: trip?.dropoffLocation?.address,
          icon: '🎯',
          color: 'text-purple-600',
          label: 'Destination'
        };
      case 'arrived':
      case 'trip_arrived':
        return {
          destination: 'Ready to start trip',
          icon: '✅',
          color: 'text-green-600',
          label: 'Status'
        };
      default:
        return {
          destination: 'Unknown',
          icon: '❓',
          color: 'text-gray-600',
          label: 'Current location'
        };
    }
  };

  // ✅ ENHANCED: Handle backend status values in getNextAction
  const getNextAction = () => {
    const normalizedStatus = trip?.status?.toLowerCase();
    switch (normalizedStatus) {
      case 'accepted':
      case 'trip_accepted':
        return { label: 'Mark as Arrived', action: () => onUpdateStatus('arrived') };
      case 'started':
      case 'trip_started':  // ✅ FIXED: Handle backend status
        return { label: 'Complete Trip', action: onCompleteTrip };
      case 'arrived':
      case 'trip_arrived':
        return { label: 'Start Trip', action: () => onUpdateStatus('started') };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const navInfo = getNavigationInfo();

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`rounded-lg p-6 border-2 ${getStatusColor()}`}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
              🚗
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            Active Trip
          </h3>
          
          <p className="text-sm opacity-75 mb-2">
            {getStatusMessage()}
          </p>

          <p className="text-xs opacity-75">
            Trip time: {formatTime(tripTimer)}
          </p>
        </div>
      </div>

      {/* Navigation Info */}
      <div className="bg-white rounded-lg p-4 border-2 border-dashed border-blue-300">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{navInfo.icon}</div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {navInfo.label}
            </p>
            <p className={`font-medium text-sm ${navInfo.color}`}>
              {navInfo.destination}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">ETA</p>
            <p className="font-semibold text-sm text-gray-800">
              {['accepted', 'trip_accepted'].includes(trip?.status?.toLowerCase()) ? '5-10 min' : 
               ['started', 'trip_started'].includes(trip?.status?.toLowerCase()) ? `${Math.ceil(trip?.distance / 2)} min` : 'Now'}
            </p>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 ${['accepted', 'trip_accepted'].includes(trip?.status?.toLowerCase()) ? 'bg-blue-500 animate-pulse' : 'bg-green-500'} rounded-full mt-2`}></div>
          <div>
            <p className="text-sm text-gray-600">Pickup</p>
            <p className="font-medium text-gray-900">{trip?.pickupLocation?.address}</p>
          </div>
        </div>

        {trip?.stops && trip.stops.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-600">Stops ({trip.stops.length})</p>
              <p className="font-medium text-gray-900">
                {trip.stops.slice(0, 2).map(stop => stop.address).join(', ')}
                {trip.stops.length > 2 && ` + ${trip.stops.length - 2} more`}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 ${['started', 'trip_started'].includes(trip?.status?.toLowerCase()) ? 'bg-purple-500 animate-pulse' : 'bg-red-500'} rounded-full mt-2`}></div>
          <div>
            <p className="text-sm text-gray-600">Destination</p>
            <p className="font-medium text-gray-900">{trip?.dropoffLocation?.address}</p>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Fare:</span>
          <span className="font-semibold text-green-600">₹{trip?.fare?.totalFare}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Distance:</span>
          <span className="font-semibold">{trip?.distance} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Vehicle:</span>
          <span className="font-semibold">{trip?.vehicleType}</span>
        </div>
      </div>

      {/* Action Button */}
      {nextAction && (
        <button
          onClick={nextAction.action}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {nextAction.label}
        </button>
      )}

      {/* Emergency Button */}
      <button
        onClick={() => window.open(`tel:${trip?.riderId?.phoneNo || 'emergency'}`, '_self')}
        className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
      >
        📞 Emergency Contact
      </button>
    </div>
  );
}

// Ride Request Card Component
function RideRequestCard({ request, onAccept, onReject, isProcessing }) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!request.createdAt && !request.requestedAt) return;

    const requestTime = new Date(request.createdAt || request.requestedAt);
    const updateTimer = () => {
      const now = new Date();
      const elapsed = Math.floor((now - requestTime) / 1000);
      setTimeElapsed(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [request.createdAt, request.requestedAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (distance) => {
    if (!distance) return 'Unknown';
    return `${distance.toFixed(1)} km`;
  };

  const formatFare = (fare) => {
    if (!fare || !fare.totalFare) return 'Unknown';
    return `₹${fare.totalFare}`;
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">New Ride Request</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">{formatTime(timeElapsed)}</span>
        </div>
      </div>

      {/* Trip Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
          <div>
            <p className="text-sm text-gray-600">Pickup</p>
            <p className="font-medium text-gray-900">{request.pickupLocation?.address || 'Location provided by rider'}</p>
          </div>
        </div>

        {request.stops && request.stops.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-600">Stops</p>
              <p className="font-medium text-gray-900">
                {request.stops.map(stop => stop.address).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
          <div>
            <p className="text-sm text-gray-600">Destination</p>
            <p className="font-medium text-gray-900">{request.dropoffLocation?.address || 'Destination provided by rider'}</p>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Distance</p>
          <p className="font-semibold">{formatDistance(request.distance)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Duration</p>
          <p className="font-semibold">{request.duration?.estimatedDuration || 'Unknown'} min</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Fare</p>
          <p className="font-semibold text-green-600">{formatFare(request.fare)}</p>
        </div>
      </div>

      {/* Vehicle Type */}
      {request.vehicleType && (
        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Requested Vehicle:</strong> {request.vehicleType}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onReject(request._id)}
          disabled={isProcessing}
          className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Decline'}
        </button>
        <button
          onClick={() => onAccept(request._id)}
          disabled={isProcessing}
          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Accept Ride'}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-3">
        This request will expire automatically if not responded to within 2 minutes
      </p>
    </div>
  );
}

function OnlineOfflineToggle({ isOnline, onToggle, disabled, isUpdating }) {
  return (
    <button 
      onClick={onToggle}
      disabled={disabled || isUpdating}
      className={`w-full py-3 text-md font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
        disabled || isUpdating
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
          : isOnline 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {isUpdating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Updating...
        </>
      ) : (
        isOnline ? 'Go Offline' : 'Go Online'
      )}
    </button>
  );
}

// ✅ ENHANCED: Driver Page Content with Dynamic Navigation
function DriverPageContent() {
  // All state variables
  const [isOnline, setIsOnline] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  // Backend Connection State
  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    lastUpdate: null,
    retryCount: 0
  });

  // Location Update Interval Refs
  const locationUpdateInterval = useRef(null);
  const watchId = useRef(null);
  const lastLocationSent = useRef(null);
  const rideRequestInterval = useRef(null);
  const shouldPollRequests = useRef(true);

  // Load initial driver status from backend
  useEffect(() => {
    const loadInitialStatus = async () => {
      setIsHydrated(true);
      
      if (typeof window !== "undefined") {
        if (!driverService.checkDriverPermissions()) {
          setAuthError('You must be logged in as a driver to use this feature');
          return;
        }

        console.log('🚀 Loading initial driver status from backend...');
        
        const statusResult = await driverService.getDriverStatus();
        
        if (statusResult.success) {
          const backendStatus = statusResult.status === 'online';
          console.log(`✅ Backend driver status: ${statusResult.status}`);
          setIsOnline(backendStatus);
        } else {
          console.warn('⚠️ Failed to load driver status, defaulting to offline');
          const savedStatus = localStorage.getItem('driverOnlineStatus');
          if (savedStatus) {
            setIsOnline(JSON.parse(savedStatus));
          }
        }

        setAuthError(null);
      }
    };

    loadInitialStatus();
  }, []);

  // Enhanced Send Location to Backend
  const sendLocationToBackend = useCallback(async (coordinates) => {
    if (!coordinates || !isOnline) return;

    if (authError) {
      console.log('🚫 Skipping location update due to auth error:', authError);
      return;
    }

    if (lastLocationSent.current) {
      const distance = Math.sqrt(
        Math.pow(coordinates.lat - lastLocationSent.current.lat, 2) + 
        Math.pow(coordinates.lng - lastLocationSent.current.lng, 2)
      );
      
      if (distance < 0.0001 && coordinates.accuracy > 50) {
        console.log('🔄 Location unchanged, skipping backend update');
        return;
      }
    }

    const result = await driverService.updateDriverLocation({
      lat: coordinates.lat,
      lng: coordinates.lng,
      accuracy: coordinates.accuracy
    });

    if (result.success) {
      setBackendStatus({
        connected: true,
        lastUpdate: new Date().toLocaleTimeString(),
        retryCount: 0
      });
      
      lastLocationSent.current = {
        lat: coordinates.lat,
        lng: coordinates.lng,
        timestamp: Date.now()
      };

      console.log('✅ Location successfully sent to backend');
    } else {
      setBackendStatus(prev => ({
        connected: false,
        lastUpdate: prev.lastUpdate,
        retryCount: prev.retryCount + 1
      }));

      if (backendStatus.retryCount < 3) {
        console.log(`🔄 Retrying location update (attempt ${backendStatus.retryCount + 1}/3)`);
        setTimeout(() => sendLocationToBackend(coordinates), 2000);
      }
    }
  }, [isOnline, authError, backendStatus.retryCount]);

  // Start/Stop Location Updates Every 10 Seconds
  const startLocationUpdates = useCallback(() => {
    if (locationUpdateInterval.current || authError || !isOnline) return;

    console.log('🚀 Starting 10-second location updates to backend');
    
    locationUpdateInterval.current = setInterval(() => {
      if (driverLocation && isOnline && !authError) {
        console.log('⏰ 10-second interval: Sending location to backend');
        sendLocationToBackend({
          lat: driverLocation.lat,
          lng: driverLocation.lng,
          accuracy: locationAccuracy
        });
      }
    }, 10000);

  }, [driverLocation, isOnline, locationAccuracy, sendLocationToBackend, authError]);

  const stopLocationUpdates = useCallback(() => {
    if (locationUpdateInterval.current) {
      console.log('🛑 Stopping location updates to backend');
      clearInterval(locationUpdateInterval.current);
      locationUpdateInterval.current = null;
    }
  }, []);

  // Check for ride requests with stop control
  const startRideRequestPolling = useCallback(() => {
    if (rideRequestInterval.current || !isOnline || authError || activeTrip) return;

    console.log('🔄 Starting ride request polling...');
    shouldPollRequests.current = true;
    
    const checkRequests = async () => {
      if (!shouldPollRequests.current || activeTrip) {
        console.log('🛑 Skipping ride request check - have active trip or stopped');
        return;
      }

      const result = await driverService.checkForRideRequests();
      if (result.success && result.requests.length > 0 && !activeTrip) {
        console.log(`📨 Found ${result.requests.length} pending ride requests`);
        setPendingRequests(result.requests);
      } else {
        setPendingRequests([]);
      }
    };

    checkRequests();
    rideRequestInterval.current = setInterval(checkRequests, 5000);
  }, [isOnline, authError, activeTrip]);

  const stopRideRequestPolling = useCallback(() => {
    console.log('🛑 Stopping ride request polling');
    shouldPollRequests.current = false;
    
    if (rideRequestInterval.current) {
      clearInterval(rideRequestInterval.current);
      rideRequestInterval.current = null;
    }
    setPendingRequests([]);
  }, []);

  // Handle Accept Ride Request
  const handleAcceptRequest = async (tripId) => {
    setIsProcessingRequest(true);
    
    try {
      console.log('🚀 Processing ride acceptance for trip:', tripId);
      
      if (!driverService.checkDriverPermissions()) {
        setAuthError('Please login as a driver to accept rides');
        return;
      }
      
      const result = await driverService.acceptRideRequest(tripId);
      
      if (result.success) {
        console.log('✅ Ride request accepted successfully');
        
        setActiveTrip(result.trip);
        stopRideRequestPolling();
        setPendingRequests([]);
        
        console.log('🛑 Stopped ride request polling - trip accepted');
        setAuthError(null);
        
      } else {
        console.error('❌ Failed to accept ride request:', result.error);
        
        if (result.userMessage) {
          setAuthError(result.userMessage);
        }
        
        if (result.error.includes('AUTHORIZATION') || result.error.includes('403')) {
          console.warn('🔑 Authorization issue detected, may need re-authentication');
        }
      }
    } catch (error) {
      console.error('❌ Error accepting ride request:', error);
      setAuthError('Failed to accept ride. Please try again or re-login.');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Handle Reject Ride Request
  const handleRejectRequest = async (tripId) => {
    setIsProcessingRequest(true);
    
    try {
      const result = await driverService.rejectRideRequest(tripId, 'Driver declined');
      
      if (result.success) {
        console.log('✅ Ride request rejected successfully');
        setPendingRequests(prev => prev.filter(req => req._id !== tripId));
      } else {
        console.error('❌ Failed to reject ride request:', result.error);
      }
    } catch (error) {
      console.error('❌ Error rejecting ride request:', error);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Handle trip status updates
  const handleUpdateTripStatus = async (newStatus) => {
    if (!activeTrip) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/${activeTrip._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverService.getAuthToken()}`,
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedTrip = { ...activeTrip, status: newStatus };
        if (newStatus === 'arrived') {
          updatedTrip.arrivedAt = new Date().toISOString();
        } else if (newStatus === 'started') {
          updatedTrip.startedAt = new Date().toISOString();
        }
        setActiveTrip(updatedTrip);
        console.log(`✅ Trip status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error('❌ Error updating trip status:', error);
    }
  };

  // Handle trip completion
  const handleCompleteTrip = async () => {
    if (!activeTrip) return;

    try {
      await handleUpdateTripStatus('completed');
      
      setActiveTrip(null);
      shouldPollRequests.current = true;
      
      if (isOnline && !authError) {
        startRideRequestPolling();
        console.log('🔄 Restarted ride request polling - trip completed');
      }
      
    } catch (error) {
      console.error('❌ Error completing trip:', error);
    }
  };

  // Start/Stop Updates When Online Status Changes
  useEffect(() => {
    if (isOnline && driverLocation && !authError) {
      startLocationUpdates();
      if (!activeTrip) {
        startRideRequestPolling();
      }
    } else {
      stopLocationUpdates();
      stopRideRequestPolling();
    }

    return () => {
      stopLocationUpdates();
      stopRideRequestPolling();
    };
  }, [isOnline, driverLocation, startLocationUpdates, stopLocationUpdates, startRideRequestPolling, stopRideRequestPolling, authError, activeTrip]);

  // Enhanced GPS with Backend Integration
  useEffect(() => {
    if (!isOnline || !isHydrated) {
      setDriverLocation(null);
      setLocationAccuracy(null);
      setBackendStatus({ connected: false, lastUpdate: null, retryCount: 0 });
      stopLocationUpdates();
      
      if (watchId.current && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      
      return;
    }

    if (!driverService.checkDriverPermissions()) {
      setAuthError('Driver authentication required. Please log in as a driver.');
      return;
    }

    setIsGettingLocation(true);
    setAuthError(null);
    
    const getEnhancedGPS = async () => {
      try {
        console.log('🚀 Driver GPS acquisition starting...');
        
        gpsUtils.clearCache();
        
        let bestPosition = null;
        let bestAccuracy = Infinity;
        
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`🛰️ Driver GPS Attempt ${attempt}/2`);
            
            const position = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`GPS_TIMEOUT_ATTEMPT_${attempt}`));
              }, attempt === 1 ? 15000 : 20000);

              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  clearTimeout(timeout);
                  resolve(pos);
                },
                (err) => {
                  clearTimeout(timeout);
                  reject(err);
                },
                {
                  enableHighAccuracy: attempt === 2,
                  maximumAge: 0,
                  timeout: attempt === 1 ? 10000 : 15000
                }
              );
            });

            console.log(`📡 Driver Attempt ${attempt}: ±${position.coords.accuracy}m at ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);

            if (position.coords.accuracy < bestAccuracy) {
              bestPosition = position;
              bestAccuracy = position.coords.accuracy;
              console.log(`✅ Driver: New best accuracy: ±${bestAccuracy}m`);
            }

            if (bestAccuracy <= 20) {
              console.log(`🎯 Driver: Excellent accuracy achieved early: ±${bestAccuracy}m`);
              break;
            }

            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

          } catch (attemptError) {
            console.warn(`❌ Driver GPS Attempt ${attempt} failed:`, attemptError.message);
            if (attempt === 2 && !bestPosition) {
              throw attemptError;
            }
          }
        }

        if (!bestPosition) {
          throw new Error('All GPS attempts failed');
        }

        const driverCoords = {
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy
        };
        
        setDriverLocation(driverCoords);
        setLocationAccuracy(bestPosition.coords.accuracy);
        
        console.log('🚗📍 DRIVER GPS COORDINATES:');
        console.log(`   Latitude:  ${driverCoords.lat}`);
        console.log(`   Longitude: ${driverCoords.lng}`);
        console.log(`   Accuracy:  ±${Math.round(bestPosition.coords.accuracy)}m`);

        await sendLocationToBackend(driverCoords);
        
        console.log(`✅ Driver GPS success: ±${Math.round(bestPosition.coords.accuracy)}m`);

      } catch (error) {
        console.error('❌ Driver GPS failed:', error);
        setAuthError('GPS Error: Unable to get your location. Please check device settings.');
      } finally {
        setIsGettingLocation(false);
      }
    };

    getEnhancedGPS();

    const startWatching = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            const newAccuracy = position.coords.accuracy;
            
            if (!driverLocation || 
                Math.abs(newLat - driverLocation.lat) > 0.0001 || 
                Math.abs(newLng - driverLocation.lng) > 0.0001 ||
                newAccuracy < (locationAccuracy || Infinity) * 0.8) {
              
              const updatedLocation = { 
                lat: newLat, 
                lng: newLng, 
                accuracy: newAccuracy 
              };
              
              setDriverLocation(updatedLocation);
              setLocationAccuracy(newAccuracy);
              
              console.log(`📍 Driver location updated: ${newLat.toFixed(6)}, ${newLng.toFixed(6)} (±${Math.round(newAccuracy)}m)`);
            }
          },
          (error) => {
            console.warn('📡 Watch GPS error:', error.message);
          },
          {
            enableHighAccuracy: false,
            maximumAge: 30000,
            timeout: 15000
          }
        );
      }
    };

    setTimeout(startWatching, 5000);

    return () => {
      if (watchId.current && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      stopLocationUpdates();
    };
  }, [isOnline, isHydrated, sendLocationToBackend, stopLocationUpdates]);

  // Handle online/offline toggle with backend API
  const handleToggleOnline = async () => {
    if (authError) {
      return;
    }
    
    setIsUpdatingStatus(true);
    
    try {
      const newOnlineStatus = !isOnline;
      console.log(`🔄 Toggling driver status to: ${newOnlineStatus ? 'ONLINE' : 'OFFLINE'}`);
      
      const result = await driverService.setDriverStatus(newOnlineStatus);
      
      if (result.success) {
        setIsOnline(newOnlineStatus);
        localStorage.setItem('driverOnlineStatus', JSON.stringify(newOnlineStatus));
        
        if (!newOnlineStatus) {
          setDriverLocation(null);
          setLocationAccuracy(null);
          setBackendStatus({ connected: false, lastUpdate: null, retryCount: 0 });
          stopLocationUpdates();
          stopRideRequestPolling();
          setActiveTrip(null);
        }
        
        console.log(`✅ Driver status successfully updated to: ${newOnlineStatus ? 'ONLINE' : 'OFFLINE'}`);
      } else {
        console.error('❌ Failed to update driver status:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Failed to update driver status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ✅ FIXED: Get navigation coordinates based on trip status (with backend status mapping)  
  const getNavigationCoordinates = () => {
    if (!activeTrip) return null;

    console.log('🗺️ Getting navigation coordinates for trip status:', activeTrip.status);
    console.log('🚗 Driver location:', driverLocation);
    console.log('📍 Trip locations:', {
      pickup: activeTrip.pickupLocation?.coordinates,
      dropoff: activeTrip.dropoffLocation?.coordinates,
      stops: activeTrip.stops?.length || 0
    });

    // Extract coordinates safely
    const pickup = activeTrip.pickupLocation?.coordinates 
      ? { lat: activeTrip.pickupLocation.coordinates[1], lng: activeTrip.pickupLocation.coordinates[0] }
      : null;
      
    const dropoff = activeTrip.dropoffLocation?.coordinates
      ? { lat: activeTrip.dropoffLocation.coordinates[1], lng: activeTrip.dropoffLocation.coordinates[0] }
      : null;

    const stops = activeTrip.stops?.map(stop => ({
      lat: stop.coordinates[1], 
      lng: stop.coordinates[0]
    })) || [];

    // ✅ FIXED: Handle both frontend and backend status values
    const normalizedStatus = activeTrip.status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'accepted':
      case 'trip_accepted':
        console.log('📍 Navigation: Driver → Pickup Location');
        return {
          pickup: driverLocation,
          drop: pickup,
          stops: [],
          showRoute: true,
          routeType: 'pickup',
          showDriverPin: true
        };
        
      case 'arrived':
      case 'trip_arrived':
        console.log('🗺️ Navigation: Complete Trip Route Overview');
        return {
          pickup: pickup,
          drop: dropoff,
          stops: stops,
          showRoute: true,
          showMultipleRoutes: false,
          routeType: 'complete_overview',
          showDriverPin: false  // Hide driver pin in overview mode
        };
        
      case 'started':
      case 'trip_started':  // ✅ FIXED: Handle backend status
        console.log('🎯 Navigation: Pickup → Destination (with stops)');
        return {
          pickup: pickup,
          drop: dropoff,
          stops: stops,
          showRoute: true,
          routeType: 'destination',
          showDriverPin: true
        };
        
      default:
        console.log('❓ Unknown trip status, showing basic navigation:', activeTrip.status);
        // ✅ FALLBACK: Show basic navigation even for unknown statuses
        return {
          pickup: pickup || driverLocation,
          drop: dropoff,
          stops: stops,
          showRoute: true,
          routeType: 'fallback',
          showDriverPin: true
        };
    }
  };

  if (!isHydrated) {
    return (
      <>
        <div className="w-full lg:w-1/2 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 md:p-10">
            <div className="text-center pt-10">
              <h1 className="text-2xl font-semibold">Loading...</h1>
              <p className="text-gray-500 mt-2 mb-6">Synchronizing with backend...</p>
              <div className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg animate-pulse">
                Loading driver status...
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
          <div className="h-full bg-gray-200 animate-pulse flex items-center justify-center">
            <p className="text-gray-500">Loading Map...</p>
          </div>
        </div>
      </>
    );
  }

  const navCoords = getNavigationCoordinates();

  return (
    <>
      <div className="w-full lg:w-1/2 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-10">
          {/* Show Active Trip, Ride Requests, or Online Status */}
          {activeTrip ? (
            <ActiveTripCard
              trip={activeTrip}
              driverLocation={driverLocation}
              onCompleteTrip={handleCompleteTrip}
              onUpdateStatus={handleUpdateTripStatus}
            />
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <RideRequestCard
                  key={request._id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                  isProcessing={isProcessingRequest}
                />
              ))}
            </div>
          ) : (
            <div className="text-center pt-10">
              <h1 className="text-2xl font-semibold">
                {isOnline ? "You are Online" : "You are Offline"}
              </h1>
              <p className="text-gray-500 mt-2 mb-6">
                {isOnline ? "Searching for nearby trips..." : "You will not receive trip requests."}
              </p>
              
              {!isOnline && (
                <div className="mb-6 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
                  📱 Go online to start receiving trip requests and enable GPS tracking
                </div>
              )}
              
              {isOnline && driverLocation && (
                <div className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                  📍 GPS Active - Location accuracy: ±{Math.round(locationAccuracy)}m
                  <div className="mt-2 text-xs">
                    🔍 Monitoring for ride requests...
                  </div>
                </div>
              )}
              
              {authError && (
                <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                  🔐 {authError}
                </div>
              )}
              
              {isGettingLocation && isOnline && (
                <div className="mb-6 text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Getting your GPS location...</span>
                </div>
              )}
              
              <OnlineOfflineToggle 
                isOnline={isOnline} 
                onToggle={handleToggleOnline}
                disabled={!!authError}
                isUpdating={isUpdatingStatus}
              />
            </div>
          )}
        </div>
      </div>

      {/* ✅ ENHANCED: Map with dynamic route updates */}
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
        <GoogleMap 
          key={`driver-map-${driverLocation ? driverLocation.lat + driverLocation.lng : 'no-location'}-${activeTrip ? activeTrip.status : 'idle'}`}
          pickup={navCoords ? navCoords.pickup : driverLocation}
          drop={navCoords ? navCoords.drop : null}
          stops={navCoords ? navCoords.stops : []}
          route={navCoords && navCoords.showRoute ? { 
            waypoints: navCoords.stops || [], 
            avoidTolls: false, 
            avoidHighways: false 
          } : null}
          userType="driver"
          driverLocation={driverLocation}
          isInteractive={true}
          showRoute={navCoords ? navCoords.showRoute : false}
          showDriverPin={navCoords ? navCoords.showDriverPin : true}
          showMultipleRoutes={navCoords ? navCoords.showMultipleRoutes : false}
        />
      </div>
    </>
  );
}

export default function DriverPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col lg:flex-row">
      <Suspense fallback={<div className="w-full flex items-center justify-center min-h-screen"><p>Loading Driver Interface...</p></div>}>
        <DriverPageContent />
      </Suspense>
    </main>
  );
}
