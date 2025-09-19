// SelectCarPage.js - ENHANCED WITH FAST TRIP STATUS DETECTION
'use client';
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { gpsService } from '../../utils/gpsService';

// Use Google Maps component with singleton loader
const GoogleMap = dynamic(() => import('../../components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Loading multiple routes...</p>
    </div>
  )
});

// Icon components
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LocationIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const StarIcon = ({ className, filled = false }) => (
  <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const CreditCardIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

// Enhanced Backend Service with FASTER trip status detection
const apiService = {
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
        return token;
      }
    }

    return null;
  },

  getCurrentUserId() {
    try {
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
        },
        () => {
          const userInfo = localStorage.getItem('userInfo');
          if (userInfo) {
            const userInfoData = JSON.parse(userInfo);
            return userInfoData.id || userInfoData._id || userInfoData.userId;
          }
          return null;
        },
        () => {
          const token = this.getAuthToken();
          if (token && token.includes('.')) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              return payload.id || payload.userId || payload.sub;
            } catch (e) {
              // Could not decode token for user ID
            }
          }
          return null;
        }
      ];

      for (const getSource of sources) {
        const userId = getSource();
        if (userId && userId !== 'null' && userId !== 'undefined') {
          return userId;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  getValidVehicleType(driver) {
    if (!driver) {
      return 'Sedan';
    }

    let vehicleInfo = '';
    
    if (driver.vehicleType && driver.vehicleType !== 'Unknown Vehicle') {
      vehicleInfo = driver.vehicleType.toUpperCase();
    } else if (driver.vehicle?.type) {
      vehicleInfo = driver.vehicle.type.toUpperCase();
    } else if (driver.vehicle?.make) {
      vehicleInfo = `${driver.vehicle.make} ${driver.vehicle.model || ''}`.toUpperCase();
    }

    if (vehicleInfo.includes('SUV') || 
        vehicleInfo.includes('UTILITY') ||
        vehicleInfo.includes('CRETA') ||
        vehicleInfo.includes('DUSTER') ||
        vehicleInfo.includes('ECOSPORT') ||
        vehicleInfo.includes('FORTUNER') ||
        vehicleInfo.includes('SCORPIO') ||
        vehicleInfo.includes('XUV') ||
        vehicleInfo.includes('SAFARI') ||
        vehicleInfo.includes('HARRIER')) {
      return 'SUV';
    } 
    
    if (vehicleInfo.includes('VAN') || 
        vehicleInfo.includes('MPV') ||
        vehicleInfo.includes('INNOVA') ||
        vehicleInfo.includes('ERTIGA') ||
        vehicleInfo.includes('MARAZZO') ||
        vehicleInfo.includes('TRAVELLER') ||
        vehicleInfo.includes('TEMPO')) {
      return 'Van';
    }
    
    return 'Sedan';
  },

  async getNearbyDrivers(lat, lng) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/rider/getDriver?lat=${lat}&lng=${lng}`;
      const response = await fetch(url, {
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
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You must be a rider to search for drivers.');
        } else {
          throw new Error(errorData.message || 'Failed to fetch nearby drivers.');
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        drivers: data.data?.drivers || [],
        count: data.results || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        drivers: [],
        count: 0
      };
    }
  },

  async createTrip(tripData) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      if (!tripData.driverId) {
        throw new Error('Driver ID is required to create trip.');
      }

      const vehicleType = this.getValidVehicleType(tripData.driver);
      const distance = parseFloat(tripData.distance) || 10;
      const duration = parseFloat(tripData.duration) || 30;
      
      let baseFarePerKm = 12;
      if (vehicleType === 'SUV') {
        baseFarePerKm = tripData.selectedRoute?.type === 'highway' ? 18 : 15;
      } else if (vehicleType === 'Van') {
        baseFarePerKm = tripData.selectedRoute?.type === 'highway' ? 22 : 18;
      } else {
        baseFarePerKm = tripData.selectedRoute?.type === 'highway' ? 15 : 12;
      }

      const baseFare = vehicleType === 'Van' ? 35 : vehicleType === 'SUV' ? 30 : 25;
      const distanceFare = distance * baseFarePerKm;
      const timeFare = (duration / 60) * 5;
      const surgePricing = 1.0;
      const totalFare = Math.round((baseFare + distanceFare + timeFare) * surgePricing);

      const formattedStops = (tripData.stops || []).map(stop => ({
        type: 'Point',
        coordinates: [stop.lng || 0, stop.lat || 0],
        address: stop.name || stop.address || 'Unknown stop'
      }));

      const requestBody = {
        riderId: userId,
        driverId: tripData.driverId,
        pickupLocation: {
          type: 'Point',
          coordinates: [tripData.pickupLocation.lng, tripData.pickupLocation.lat],
          address: tripData.pickupAddress
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [tripData.dropoffLocation.lng, tripData.dropoffLocation.lat],
          address: tripData.dropoffAddress
        },
        stops: formattedStops,
        status: 'requested',
        vehicleType: vehicleType,
        fare: {
          baseFare: baseFare,
          distanceFare: distanceFare,
          timeFare: timeFare,
          surgePricing: surgePricing,
          totalFare: totalFare,
          currency: 'Rupees'
        },
        distance: distance,
        duration: {
          estimatedDuration: duration,
          actualDuration: 0
        }
      };

      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You must be a rider to create trips.');
        } else if (response.status === 400) {
          const validationError = errorData.message || 'Invalid trip data';
          throw new Error(`Validation Error: ${validationError}`);
        } else {
          throw new Error(errorData.message || 'Failed to create trip.');
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        trip: data.data?.trip || data.data,
        tripId: data.data?.trip?.newTrip?._id || data.data?.newTrip?._id || data.data?.trip?._id || data.data?._id
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Enhanced: Better trip status API call with retry logic and no cache
  async getTripStatus(tripId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/trips/${tripId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trip status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        trip: data.data?.trip || data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getDriverLocation(driverId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/drivers/${driverId}/location`;
      const response = await fetch(url, {
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
        throw new Error('Failed to fetch driver location');
      }

      const data = await response.json();
      return {
        success: true,
        location: data.data?.location || data.location
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async createPaymentSession(tripId, tipAmount = 0, promoCode = null) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const requestBody = {
        tripId,
        tipAmount,
        promoCode
      };

      const url = `${process.env.NEXT_PUBLIC_API_BASE}/api/drive/payment/create-session`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-access-token': token
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You must be a rider to create payment sessions.');
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid payment data.');
        } else {
          throw new Error(errorData.message || 'Failed to create payment session.');
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        paymentId: data.data?.paymentId,
        sessionId: data.data?.sessionId,
        url: data.data?.url,
        expiresAt: data.data?.expiresAt,
        amount: data.data?.amount,
        currency: data.data?.currency || 'inr'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// New: Trip Completed - Payment Card Component
function TripCompletedPaymentCard({ trip, driver, onPayNow, onPayLater }) {
  const [tipAmount, setTipAmount] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const quickTipOptions = [0, 10, 20, 50];

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const result = await apiService.createPaymentSession(trip._id, tipAmount);
      
      if (result.success) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        setPaymentError(result.error || 'Failed to create payment session');
      }
    } catch (error) {
      setPaymentError('Failed to process payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalAmount = (trip?.fare?.totalFare || 0) + tipAmount;

  return (
    <div className="space-y-4">
      {/* Trip Completed Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white text-2xl">
              ✅
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-green-800">
            Trip Completed Successfully!
          </h3>
          
          <p className="text-sm text-green-700 mb-2">
            Thank you for choosing our service
          </p>

          <p className="text-xs text-green-600">
            Rate your experience and complete payment
          </p>
        </div>
      </div>

      {/* Driver & Trip Info */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-shrink-0">
            {driver?.photo && driver.photo !== 'default-driver.jpg' ? (
              <img 
                src={driver.photo} 
                alt={driver.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{driver?.name}</h4>
            <p className="text-sm text-gray-600">
              {driver?.vehicleType !== 'Unknown Vehicle' ? driver?.vehicleType : 'Vehicle'}
            </p>
            <p className="text-xs text-gray-500">{driver?.vehiclePlate !== 'N/A' ? driver?.vehiclePlate : 'Verified Vehicle'}</p>
          </div>

          <div className="text-right">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 text-yellow-400" filled={true} />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rate this trip</p>
          </div>
        </div>

        {/* Trip Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare:</span>
            <span className="font-medium">₹{trip?.fare?.baseFare || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Distance ({trip?.distance} km):</span>
            <span className="font-medium">₹{trip?.fare?.distanceFare || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Time Fare:</span>
            <span className="font-medium">₹{trip?.fare?.timeFare || 0}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Driver Tip:</span>
              <span className="font-medium text-green-600">₹{tipAmount}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-base font-semibold">
            <span>Total Amount:</span>
            <span className="text-green-600">₹{totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Tip Selection */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Add a tip for your driver (optional)</h4>
        
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickTipOptions.map((amount) => (
            <button
              key={amount}
              onClick={() => setTipAmount(amount)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tipAmount === amount
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {amount === 0 ? 'No tip' : `₹${amount}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Custom amount:</span>
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tip amount"
            min="0"
            max="500"
          />
        </div>
      </div>

      {/* Payment Error */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{paymentError}</p>
        </div>
      )}

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          onClick={handlePayment}
          disabled={isProcessingPayment}
          className="w-full bg-green-600 text-white px-4 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg flex items-center justify-center disabled:bg-gray-400"
        >
          {isProcessingPayment ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCardIcon className="w-5 h-5 mr-2" />
              Pay Now - ₹{totalAmount}
            </>
          )}
        </button>

        <button
          onClick={onPayLater}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Pay Later
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Secure payment powered by Stripe • Your card details are encrypted
        </p>
      </div>
    </div>
  );
}

// Enhanced: Waiting for Driver Component with better status detection
function WaitingForDriverCard({ trip, driver, onCancel }) {
  const [timeWaiting, setTimeWaiting] = useState(0);
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeWaiting(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (trip?.status === 'accepted' && driver?.id) {
      const locationPoller = setInterval(async () => {
        const result = await apiService.getDriverLocation(driver.id);
        if (result.success) {
          setDriverLocation(result.location);
        }
      }, 5000);

      apiService.getDriverLocation(driver.id).then(result => {
        if (result.success) {
          setDriverLocation(result.location);
        }
      });

      return () => clearInterval(locationPoller);
    }
  }, [trip?.status, driver?.id]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced: Better status message handling with completion detection
  const getStatusMessage = () => {
    switch (trip?.status?.toLowerCase()) {
      case 'requested':
        return 'Waiting for driver to accept your ride...';
      case 'accepted':
      case 'trip_accepted':
        return `${driver?.name} is coming to pick you up!`;
      case 'arrived':
      case 'trip_arrived':
        return `${driver?.name} has arrived at your location!`;
      case 'started':
      case 'trip_started':
        return 'Your trip has started. Enjoy the ride!';
      case 'completed':
      case 'trip_completed':
      case 'finished':
        return '🎉 Trip completed successfully!';
      default:
        return 'Processing your ride request...';
    }
  };

  // Enhanced: Better status color handling
  const getStatusColor = () => {
    switch (trip?.status?.toLowerCase()) {
      case 'requested':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'accepted':
      case 'trip_accepted':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'arrived':
      case 'trip_arrived':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'started':
      case 'trip_started':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'completed':
      case 'trip_completed':
      case 'finished':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-6 border-2 ${getStatusColor()}`}>
        <div className="text-center">
          <div className="mb-4">
            {trip?.status === 'requested' ? (
              <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {getStatusMessage()}
          </h3>
          
          <p className="text-sm opacity-75 mb-4">
            Time waiting: {formatTime(timeWaiting)}
          </p>

          {trip?.status === 'accepted' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                ETA: {Math.ceil(driver?.distanceKm * 2)} minutes
              </p>
              {driverLocation && (
                <p className="text-xs opacity-75">
                  Driver location updated: {new Date().toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {driver?.photo && driver.photo !== 'default-driver.jpg' ? (
              <img 
                src={driver.photo} 
                alt={driver.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{driver?.name}</h4>
            <p className="text-sm text-gray-600">
              {driver?.vehicleType !== 'Unknown Vehicle' ? driver?.vehicleType : 'Vehicle Available'}
            </p>
            <p className="text-xs text-gray-500">{driver?.vehiclePlate !== 'N/A' ? driver?.vehiclePlate : 'Verified Vehicle'}</p>
            <p className="text-xs text-blue-600 font-medium">
              {apiService.getValidVehicleType(driver)}
            </p>
          </div>

          <div>
            <button
              onClick={() => window.open(`tel:${driver?.phoneNo}`, '_self')}
              className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
              title="Call driver"
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Estimated Fare:</span>
          <span className="font-semibold">₹{trip?.fare?.totalFare}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Distance:</span>
          <span className="font-semibold">{trip?.distance} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trip ID:</span>
          <span className="font-mono text-xs">{trip?._id}</span>
        </div>
      </div>

      {trip?.status === 'requested' && (
        <button
          onClick={onCancel}
          className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
        >
          Cancel Ride Request
        </button>
      )}
    </div>
  );
}

// Keep all other existing components (DriverCard, RouteOption, etc.) the same...
function DriverCard({ driver, onSelect, isSelected }) {
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-400" filled={true} />);
    }
    
    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="w-4 h-4 text-yellow-400" filled={true} />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" filled={false} />);
    }
    
    return stars;
  };

  const vehicleType = apiService.getValidVehicleType(driver);

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect(driver)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {driver.photo && driver.photo !== 'default-driver.jpg' ? (
            <img 
              src={driver.photo} 
              alt={driver.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
              <UserIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{driver.name}</h3>
            {isSelected && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <div className="flex items-center space-x-1">
              {renderStars(driver.acceptanceRate / 20 || 4.5)}
              <span className="text-xs text-gray-600">
                {(driver.acceptanceRate / 20 || 4.5).toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600">{driver.totalTrips || 0} trips</span>
          </div>

          <div className="mb-2">
            <p className="text-sm text-gray-700">
              {driver.vehicleType !== 'Unknown Vehicle' ? driver.vehicleType : 'Vehicle Available'}
            </p>
            <p className="text-xs text-gray-500">
              {driver.vehiclePlate !== 'N/A' ? driver.vehiclePlate : 'Verified Vehicle'}
            </p>
            <p className="text-xs text-blue-600 font-medium">{vehicleType}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <LocationIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{driver.distanceKm.toFixed(1)} km away</span>
            </div>
            
            <div className="text-xs text-green-600 font-medium">
              {driver.status === 'online' ? 'Available' : 'Busy'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteOption({ route, isSelected, onSelect, index }) {
  const getBadgeInfo = () => {
    switch (route.type) {
      case 'fastest':
        return { text: 'Fastest', color: 'bg-green-100 text-green-800' };
      case 'shortest':
        return { text: 'Shortest', color: 'bg-blue-100 text-blue-800' };
      case 'scenic':
        return { text: 'Scenic', color: 'bg-purple-100 text-purple-800' };
      case 'highway':
        return { text: 'Highway', color: 'bg-orange-100 text-orange-800' };
      default:
        return { text: `Route ${index + 1}`, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const badge = getBadgeInfo();

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
          {badge.text}
        </span>
        {isSelected && (
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <LocationIcon className="w-4 h-4 mr-2" />
            <span className="text-sm">Distance</span>
          </div>
          <span className="font-semibold text-gray-900">{route.distance}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <ClockIcon className="w-4 h-4 mr-2" />
            <span className="text-sm">Duration</span>
          </div>
          <span className="font-semibold text-gray-900">{route.duration}</span>
        </div>
        
        {route.description && (
          <div className="mt-2">
            <p className="text-xs text-gray-600">{route.description}</p>
          </div>
        )}

        {route.tolls && (
          <div className="mt-2 flex items-center">
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Tolls: {route.tolls}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectCarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Loading multiple route options...');
  const [tripDetails, setTripDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [locationSource, setLocationSource] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

  // Multiple Routes State
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(true);

  // Driver States
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isFetchingDrivers, setIsFetchingDrivers] = useState(false);
  const [driversError, setDriversError] = useState(null);
  const [showDrivers, setShowDrivers] = useState(false);

  // Trip Booking and Tracking States
  const [isBookingTrip, setIsBookingTrip] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [isWaitingForDriver, setIsWaitingForDriver] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  // Payment States
  const [showPayment, setShowPayment] = useState(false);

  // Refs for polling control
  const pollIntervalRef = useRef(null);
  const isPollingActiveRef = useRef(false);

  // Calculate fare based on vehicle type
  const calculateFare = (distance, duration, routeType, driver) => {
    const vehicleType = apiService.getValidVehicleType(driver);
    
    let baseFarePerKm = 12;
    let baseFare = 25;
    
    if (vehicleType === 'SUV') {
      baseFarePerKm = routeType === 'highway' ? 18 : 15;
      baseFare = 30;
    } else if (vehicleType === 'Van') {
      baseFarePerKm = routeType === 'highway' ? 22 : 18;
      baseFare = 35;
    } else {
      baseFarePerKm = routeType === 'highway' ? 15 : 12;
      baseFare = 25;
    }

    const distanceFare = distance * baseFarePerKm;
    const timeFare = (duration / 60) * 5;
    
    return Math.round(baseFare + distanceFare + timeFare);
  };

  // Generate route options
  const generateRouteOptions = (tripData) => {
    const baseDistance = parseFloat(tripData.totalDistance) || 10;
    const baseDuration = parseFloat(tripData.totalDuration) || 30;
    const hasStops = tripData.stopCoordinates && tripData.stopCoordinates.length > 0;

    const routes = [
      {
        id: 'fastest',
        type: 'fastest',
        distance: `${(baseDistance * 0.98).toFixed(1)} km`,
        duration: `${Math.round(baseDuration * 0.85)} min`,
        description: 'Quickest route with minimal traffic delays',
        routeData: {
          waypoints: tripData.stopCoordinates || [],
          avoidTolls: false,
          avoidHighways: false,
          optimizeWaypoints: true
        }
      }
    ];

    if (baseDistance > 2) {
      routes.push({
        id: 'shortest',
        type: 'shortest',
        distance: `${(baseDistance * 0.92).toFixed(1)} km`,
        duration: `${Math.round(baseDuration * 1.1)} min`,
        description: 'Shortest distance through city streets',
        routeData: {
          waypoints: tripData.stopCoordinates || [],
          avoidTolls: true,
          avoidHighways: true,
          optimizeWaypoints: false
        }
      });
    }

    if (baseDistance > 5) {
      routes.push({
        id: 'highway',
        type: 'highway',
        distance: `${(baseDistance * 1.15).toFixed(1)} km`,
        duration: `${Math.round(baseDuration * 0.95)} min`,
        description: 'Highway route for faster long-distance travel',
        tolls: '₹45-65',
        routeData: {
          waypoints: tripData.stopCoordinates || [],
          avoidTolls: false,
          avoidHighways: false,
          optimizeWaypoints: false
        }
      });
    }

    if (baseDistance > 8 && (!hasStops || tripData.stopCoordinates.length <= 2)) {
      routes.push({
        id: 'scenic',
        type: 'scenic',
        distance: `${(baseDistance * 1.25).toFixed(1)} km`,
        duration: `${Math.round(baseDuration * 1.3)} min`,
        description: 'Scenic route through less congested areas',
        routeData: {
          waypoints: [...(tripData.stopCoordinates || []), 
            ...(tripData.scenicPoints || [])
          ],
          avoidTolls: true,
          avoidHighways: false,
          optimizeWaypoints: false
        }
      });
    }

    return routes;
  };

  // Handle Continue with Selected Route - Fetch Drivers
  const handleContinueWithRoute = async () => {
    if (!tripDetails || !tripDetails.pickup) {
      alert('Missing trip information. Please go back and select a route again.');
      return;
    }

    setIsFetchingDrivers(true);
    setDriversError(null);
    setShowDrivers(true);

    try {
      const result = await apiService.getNearbyDrivers(
        tripDetails.pickup.lat,
        tripDetails.pickup.lng
      );

      if (result.success) {
        setAvailableDrivers(result.drivers);
        if (result.drivers.length === 0) {
          setDriversError('No drivers available in your area. Please try again later.');
        }
      } else {
        setDriversError(result.error);
      }
    } catch (error) {
      setDriversError('Failed to find nearby drivers. Please check your connection and try again.');
    } finally {
      setIsFetchingDrivers(false);
    }
  };

  // Handle driver selection with proper ID normalization
  const handleDriverSelect = (driver) => {
    const normalizedDriver = {
      ...driver,
      _id: driver.id
    };
    
    setSelectedDriver(normalizedDriver);
    setBookingError(null);
  };

  // Enhanced: Fast trip polling with better detection
  const startTripPolling = useCallback((tripId) => {
    // Clean up any existing polling first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    isPollingActiveRef.current = true;
    
    const pollTripStatus = async () => {
      if (!isPollingActiveRef.current) {
        return;
      }
      
      try {
        const result = await apiService.getTripStatus(tripId);
        if (result.success && isPollingActiveRef.current) {
          const previousStatus = currentTrip?.status;
          setCurrentTrip(result.trip);
          
          // Handle driver location for accepted trips
          if (result.trip.status === 'accepted' && selectedDriver?.id) {
            const locationResult = await apiService.getDriverLocation(selectedDriver.id);
            if (locationResult.success && isPollingActiveRef.current) {
              setDriverLocation(locationResult.location);
            }
          }

          // Enhanced: Check for completed trip with multiple status formats
          const completedStatuses = ['completed', 'trip_completed', 'finished'];
          if (completedStatuses.includes(result.trip.status?.toLowerCase())) {
            setShowPayment(true);
            setIsWaitingForDriver(false); // Important: Stop showing waiting state
            stopTripPolling();
            
            // Play completion sound/notification if supported
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Trip Completed!', {
                  body: 'Your trip has been completed. Please proceed with payment.',
                  icon: '/favicon.ico'
                });
              }
            } catch (e) {
              // Notification not supported
            }
          }
          
          // Stop polling for other terminal states
          const terminalStatuses = ['cancelled', 'cancelled_by_driver', 'cancelled_by_rider'];
          if (terminalStatuses.includes(result.trip.status)) {
            stopTripPolling();
          }
        }
      } catch (error) {
        // Don't stop polling for temporary errors, but log them
      }
    };

    // Enhanced: Poll immediately, then every 2 seconds (much faster!)
    pollTripStatus();
    pollIntervalRef.current = setInterval(pollTripStatus, 2000); // Faster polling!
  }, [selectedDriver?.id, currentTrip?.status]);

  // Stop polling function
  const stopTripPolling = useCallback(() => {
    isPollingActiveRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Enhanced Book Ride Handler with controlled polling
  const handleBookRide = async () => {
    if (!selectedDriver) {
      setBookingError('Please select a driver first.');
      return;
    }

    if (!tripDetails) {
      setBookingError('Trip information is missing. Please go back and try again.');
      return;
    }

    const driverId = selectedDriver._id || selectedDriver.id;
    if (!driverId) {
      setBookingError('Driver ID is missing. Please select a driver again.');
      return;
    }

    setIsBookingTrip(true);
    setBookingError(null);

    try {
      const selectedRouteData = availableRoutes[selectedRoute];
      const distance = parseFloat(selectedRouteData.distance) || 10;
      const duration = parseFloat(selectedRouteData.duration) || 30;

      const tripCreationData = {
        driverId: driverId,
        driver: selectedDriver,
        pickupLocation: tripDetails.pickup,
        dropoffLocation: tripDetails.drop,
        pickupAddress: tripDetails.pickupName,
        dropoffAddress: tripDetails.dropName,
        distance: distance,
        duration: duration,
        selectedRoute: selectedRouteData,
        stops: tripDetails.stopCoordinates || []
      };

      const result = await apiService.createTrip(tripCreationData);

      if (result.success) {
        setCurrentTrip(result.trip);
        setIsWaitingForDriver(true);
        
        // Start enhanced polling
        startTripPolling(result.tripId);
        
      } else {
        setBookingError(result.error);
      }

    } catch (error) {
      setBookingError('Failed to book ride. Please try again.');
    } finally {
      setIsBookingTrip(false);
    }
  };

  // Enhanced cancel trip with proper cleanup
  const handleCancelTrip = async () => {
    // Clean up polling
    stopTripPolling();
    
    setIsWaitingForDriver(false);
    setCurrentTrip(null);
    setSelectedDriver(null);
    setShowDrivers(false);
    setDriverLocation(null);
    setShowPayment(false);
  };

  // Handle Payment Later
  const handlePayLater = () => {
    setShowPayment(false);
    setIsWaitingForDriver(false);
    setCurrentTrip(null);
    setSelectedDriver(null);
    setShowDrivers(false);
    setDriverLocation(null);
    
    // Redirect to home with success message
    router.push('/?message=trip_completed');
  };

  // Clean up polling when component unmounts
  useEffect(() => {
    return () => {
      stopTripPolling();
    };
  }, [stopTripPolling]);

  // Force geocode address
  const forceGeocodeAddress = async (address, biasLocation = null) => {
    try {
      gpsService.clearCache();
      const biasAt = biasLocation ? [biasLocation.lat, biasLocation.lng] : null;
      const results = await gpsService.searchAddress(address, biasAt);
      
      if (results && results.length > 0) {
        return {
          lat: results[0].lat,
          lng: results[0].lng,
          source: results[0].source
        };
      }
    } catch (error) {
      // Fresh geocoding error
    }
    return null;
  };

  // Check Google Maps readiness
  useEffect(() => {
    const checkGoogleMapsReady = async () => {
      try {
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            resolve(false);
          }, 15000);
        });

        const initPromise = gpsService.initGoogleMaps();
        
        const isReady = await Promise.race([initPromise, timeoutPromise]);
        
        setIsGoogleMapsReady(true);
        
      } catch (error) {
        setIsGoogleMapsReady(true);
      }
    };

    checkGoogleMapsReady();
  }, []);

  // Process trip data with routes
  useEffect(() => {
    if (!isGoogleMapsReady) return;

    const processTripDataWithRoutes = async () => {
      setIsProcessing(true);
      setIsCalculatingRoutes(true);
      
      const pickup = searchParams.get('pickup');
      const drop = searchParams.get('drop');
      const pickupLat = searchParams.get('pickupLat');
      const pickupLng = searchParams.get('pickupLng');
      const dropLat = searchParams.get('dropLat');
      const dropLng = searchParams.get('dropLng');
      const totalDistance = searchParams.get('totalDistance');
      const totalDuration = searchParams.get('totalDuration');
      const stops = searchParams.get('stops');
      const accuracy = searchParams.get('gpsAccuracy');

      const missingParams = [];
      if (!pickup) missingParams.push('pickup');
      if (!drop) missingParams.push('drop');
      if (!pickupLat) missingParams.push('pickupLat');
      if (!pickupLng) missingParams.push('pickupLng');
      if (!dropLat) missingParams.push('dropLat');
      if (!dropLng) missingParams.push('dropLng');
      
      if (missingParams.length > 0) {
        setCurrentLocationName(`Missing parameters: ${missingParams.join(', ')} - please get new GPS location`);
        setIsProcessing(false);
        setIsCalculatingRoutes(false);
        return;
      }

      const timestamp = Date.now();
      setDataTimestamp(timestamp);

      const pickupLocation = {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng)
      };

      const dropLocation = {
        lat: parseFloat(dropLat),
        lng: parseFloat(dropLng)
      };

      setCurrentLocation(pickupLocation);
      setCurrentLocationName(pickup);
      
      if (accuracy) {
        const gpsAcc = parseFloat(accuracy);
        setGpsAccuracy(gpsAcc);
        const accuracyStatus = gpsService.getAccuracyStatus(gpsAcc);
        setLocationSource(`🎯 Fresh ${accuracyStatus} GPS`);
      }

      let stopsData = [];
      let stopCoordinates = [];
      
      if (stops) {
        try {
          const stopsArray = JSON.parse(stops);
          stopsData = stopsArray.filter(stop => stop && stop.trim());
          
          if (stopsData.length > 0) {
            const geocodePromises = stopsData.map(async (stop, index) => {
              await new Promise(resolve => setTimeout(resolve, index * 100));
              const coords = await forceGeocodeAddress(stop, pickupLocation);
              return coords ? {
                name: stop,
                ...coords,
                timestamp: Date.now()
              } : null;
            });
            
            stopCoordinates = (await Promise.all(geocodePromises)).filter(Boolean);
          }
        } catch (error) {
          // Error parsing stops for routes
        }
      }

      const freshTripDetails = {
        pickup: pickupLocation,
        drop: dropLocation,
        pickupName: pickup,
        dropName: drop,
        totalDistance: totalDistance || 'Calculating',
        totalDuration: totalDuration || 'Calculating',
        stops: stopsData,
        stopCoordinates: stopCoordinates,
        locationSource: locationSource,
        gpsAccuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: timestamp,
        dataFreshness: 'FRESH'
      };

      setTripDetails(freshTripDetails);

      const routes = generateRouteOptions(freshTripDetails);
      setAvailableRoutes(routes);
      setSelectedRoute(0);
      
      setIsCalculatingRoutes(false);
      setIsProcessing(false);
    };

    processTripDataWithRoutes();
  }, [searchParams, isGoogleMapsReady]);

  const handleRouteSelect = (routeIndex) => {
    setSelectedRoute(routeIndex);
  };

  const mapKey = `routes-map-${dataTimestamp}-${selectedRoute}-${isGoogleMapsReady}`;

  if (!isGoogleMapsReady || isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isGoogleMapsReady ? 'Initializing Google Maps for routes...' : 'Calculating route options...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel */}
      <div className="w-full lg:w-2/5 bg-white shadow-lg overflow-y-auto flex-shrink-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Link href="/" className="mr-4">
              <ChevronLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {showPayment ? 'Complete Payment' : 
               isWaitingForDriver ? 'Trip Status' : 
               showDrivers ? 'Available Drivers' : 'Choose Your Route'}
            </h1>
          </div>

          {/* Trip Summary */}
          {tripDetails && !isWaitingForDriver && !showPayment && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">From:</span>
                  <span className="font-medium text-gray-900 text-sm text-right flex-1 ml-4 truncate">
                    {tripDetails.pickupName}
                  </span>
                </div>
                
                {tripDetails.stops && tripDetails.stops.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Via:</span>
                    <span className="font-medium text-gray-900 text-sm text-right flex-1 ml-4 truncate">
                      {tripDetails.stops.join(', ')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">To:</span>
                  <span className="font-medium text-gray-900 text-sm text-right flex-1 ml-4 truncate">
                    {tripDetails.dropName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced: Show Payment Interface with better state management */}
          {showPayment && currentTrip ? (
            <TripCompletedPaymentCard 
              trip={currentTrip} 
              driver={selectedDriver}
              onPayNow={() => {
                // Payment initiated for trip
              }}
              onPayLater={handlePayLater}
            />
          ) : 
          
          /* Show Waiting State */
          isWaitingForDriver ? (
            <WaitingForDriverCard 
              trip={currentTrip} 
              driver={selectedDriver}
              onCancel={handleCancelTrip}
            />
          ) : !showDrivers ? (
            <>
              {/* Route Options */}
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Route Options</h2>
                <p className="text-sm text-gray-600">Select your preferred route. The selected route will be highlighted in blue on the map.</p>
              </div>

              {isCalculatingRoutes ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="animate-pulse">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                          <div className="h-4 bg-gray-300 rounded w-4"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-300 rounded w-full"></div>
                          <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {availableRoutes.map((route, index) => (
                    <RouteOption
                      key={route.id}
                      route={route}
                      isSelected={selectedRoute === index}
                      onSelect={() => handleRouteSelect(index)}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {!isCalculatingRoutes && availableRoutes[selectedRoute] && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Selected Route</h3>
                  <div className="text-sm text-blue-800">
                    <p className="mb-1">
                      <strong>{availableRoutes[selectedRoute].type.charAt(0).toUpperCase() + availableRoutes[selectedRoute].type.slice(1)} Route</strong> - {availableRoutes[selectedRoute].distance} • {availableRoutes[selectedRoute].duration}
                    </p>
                    <p>{availableRoutes[selectedRoute].description}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={handleContinueWithRoute}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  disabled={isCalculatingRoutes}
                >
                  {isCalculatingRoutes ? 'Calculating Routes...' : 'Continue with Selected Route'}
                </button>
                
                <Link 
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                >
                  Change Destination
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Driver List */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Available Drivers</h2>
                  <button
                    onClick={() => setShowDrivers(false)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Back to Routes
                  </button>
                </div>
                <p className="text-sm text-gray-600">Choose a driver for your trip. Fare varies by vehicle type.</p>
              </div>

              {isFetchingDrivers ? (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Searching for nearby drivers...</p>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 opacity-50">
                      <div className="animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : driversError ? (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <UserIcon className="w-16 h-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Available</h3>
                  <p className="text-gray-600 text-sm mb-4">{driversError}</p>
                  <button
                    onClick={handleContinueWithRoute}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {availableDrivers.map((driver, index) => (
                      <DriverCard
                        key={driver.id || index}
                        driver={driver}
                        isSelected={selectedDriver?.id === driver.id}
                        onSelect={handleDriverSelect}
                      />
                    ))}
                  </div>

                  {selectedDriver && availableRoutes[selectedRoute] && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">Selected Driver</h3>
                      <div className="text-sm text-green-800">
                        <p className="mb-1">
                          <strong>{selectedDriver.name}</strong> • {selectedDriver.distanceKm.toFixed(1)} km away
                        </p>
                        <p>{selectedDriver.vehicleType !== 'Unknown Vehicle' ? selectedDriver.vehicleType : 'Vehicle Available'}</p>
                        <p><strong>Vehicle Type:</strong> {apiService.getValidVehicleType(selectedDriver)}</p>
                        <p className="mt-2">
                          <strong>Estimated Fare:</strong> ₹{calculateFare(
                            parseFloat(availableRoutes[selectedRoute].distance) || 10,
                            parseFloat(availableRoutes[selectedRoute].duration) || 30,
                            availableRoutes[selectedRoute].type,
                            selectedDriver
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {bookingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{bookingError}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button 
                      onClick={handleBookRide}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                      disabled={!selectedDriver || isBookingTrip}
                    >
                      {isBookingTrip ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Booking Ride...
                        </>
                      ) : selectedDriver ? `Book ${apiService.getValidVehicleType(selectedDriver)}` : 'Select a Driver'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Google Maps */}
      <div className="flex-1 h-full">
        {isGoogleMapsReady && tripDetails && (
          <GoogleMap
            key={mapKey}
            pickup={currentLocation}
            drop={tripDetails.drop}
            stops={tripDetails.stopCoordinates || []}
            routes={availableRoutes}
            selectedRoute={selectedRoute}
            route={availableRoutes[selectedRoute]?.routeData || null}
            isInteractive={true}
            userType="rider"
            showMultipleRoutes={!isWaitingForDriver && !showPayment}
            driverLocation={driverLocation}
            showDriverPin={currentTrip?.status === 'accepted'}
          />
        )}
      </div>
    </div>
  );
}

export default function SelectCarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading route options...</p>
        </div>
      </div>
    }>
      <SelectCarContent />
    </Suspense>
  );
}
