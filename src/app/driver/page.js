'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { gpsService } from '../../utils/gpsService';

const LeafletMap = dynamic(() => import('../../components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center"><p className="text-gray-500">Initializing Map...</p></div>
});

function OnlineOfflineToggle({ isOnline, onToggle, disabled }) {
  return (
    <button 
      onClick={onToggle}
      disabled={disabled}
      className={`w-full py-3 text-md font-semibold rounded-lg transition-colors ${
        disabled 
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
          : isOnline 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {isOnline ? 'Go Offline' : 'Go Online'}
    </button>
  );
}

function GPSStatusCard({ gpsStatus, locationAccuracy, hasError, onRetry }) {
  const getStatusColor = () => {
    if (hasError) return 'bg-red-50 border-red-200 text-red-800';
    if (gpsStatus.includes('Excellent')) return 'bg-green-50 border-green-200 text-green-800';
    if (gpsStatus.includes('Good') || gpsStatus.includes('Very Good')) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (gpsStatus.includes('Fair')) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} mb-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">GPS Status</h3>
          <p className="text-sm mt-1">{gpsStatus}</p>
          {locationAccuracy && (
            <p className="text-xs mt-1 opacity-75">
              Accuracy: ±{Math.round(locationAccuracy)}m
            </p>
          )}
        </div>
        {hasError && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
          >
            Retry GPS
          </button>
        )}
      </div>
      
      {hasError && (
        <div className="mt-3 p-3 bg-red-100 rounded-md">
          <h4 className="font-medium text-red-800 text-sm mb-2">📡 GPS Troubleshooting</h4>
          <ul className="text-xs text-red-700 space-y-1">
            <li>• Move to an outdoor area with clear sky view</li>
            <li>• Check location permissions in browser settings</li>
            <li>• Ensure GPS is enabled on your device</li>
            <li>• Wait 30-60 seconds for GPS satellites</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function DriverPageContent() {
  const [isOnline, setIsOnline] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Initializing...');
  const [gpsError, setGpsError] = useState(null);
  const [tripDetails, setTripDetails] = useState(null); 
  const [route, setRoute] = useState(null);

  // Handle hydration and load saved state
  useEffect(() => {
    setIsHydrated(true);
    
    if (typeof window !== "undefined") {
      const savedStatus = localStorage.getItem('driverOnlineStatus');
      if (savedStatus) {
        setIsOnline(JSON.parse(savedStatus));
      }
    }
  }, []);

  // Persist the 'isOnline' state to localStorage
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem('driverOnlineStatus', JSON.stringify(isOnline));
    }
  }, [isOnline, isHydrated]);

  // Get driver's location using GPS service
  useEffect(() => {
    if (!isOnline || !isHydrated) {
      setDriverLocation(null);
      setLocationAccuracy(null);
      setGpsStatus('Offline');
      setGpsError(null);
      return;
    }

    setGpsStatus('🛰️ Acquiring GPS satellites...');
    setGpsError(null);
    
    const handleDriverLocationUpdate = (position, error) => {
      if (error) {
        let userFriendlyMessage = '';
        let troubleshootingMessage = '';
        
        if (error.message.includes('denied')) {
          userFriendlyMessage = '❌ Location Access Denied';
          troubleshootingMessage = 'Please enable location permissions in your browser settings and refresh the page.';
        } else if (error.message.includes('unavailable')) {
          userFriendlyMessage = '📡 GPS Satellites Unavailable';
          troubleshootingMessage = 'Move to an outdoor area with clear sky visibility for better GPS reception.';
        } else if (error.message.includes('timeout')) {
          userFriendlyMessage = '⏱️ GPS Timeout';
          troubleshootingMessage = 'GPS is taking too long. Try moving outdoors and ensure location services are enabled.';
        } else if (error.message.includes('GPS_POOR_ACCURACY')) {
          userFriendlyMessage = '📶 GPS Signal Too Weak';
          troubleshootingMessage = 'Current GPS accuracy is insufficient for driver tracking. Please move outdoors for better signal.';
        } else {
          userFriendlyMessage = '❌ GPS Error';
          troubleshootingMessage = 'Unable to get your location. Please check your device settings and try again.';
        }
        
        setGpsStatus(userFriendlyMessage);
        setGpsError({
          message: userFriendlyMessage,
          troubleshooting: troubleshootingMessage,
          canRetry: true
        });
        return;
      }

      // GPS success
      setGpsError(null);
      const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
      setDriverLocation(newLocation);
      setLocationAccuracy(position.coords.accuracy);
      
      const accuracyStatus = gpsService.getAccuracyStatus(position.coords.accuracy);
      let statusEmoji = '';
      switch (accuracyStatus) {
        case 'Excellent': statusEmoji = '🎯'; break;
        case 'Very Good': statusEmoji = '✅'; break;
        case 'Good': statusEmoji = '✅'; break;
        case 'Fair': statusEmoji = '⚠️'; break;
        default: statusEmoji = '📍'; break;
      }
      
      setGpsStatus(`${statusEmoji} GPS ${accuracyStatus} - Driver Location Active`);
    };

    gpsService.startWatching(handleDriverLocationUpdate);

    return () => {
      gpsService.stopWatching(handleDriverLocationUpdate);
    };
  }, [isOnline, isHydrated]);

  const handleToggleOnline = () => {
    if (gpsError && !isOnline) {
      // Don't allow going online if there's a GPS error
      return;
    }
    
    setIsOnline(prev => !prev);
    if (isOnline) {
      setTripDetails(null);
      setRoute(null);
      setGpsError(null);
    }
  };

  const handleGPSRetry = () => {
    setGpsError(null);
    setGpsStatus('🛰️ Retrying GPS...');
    
    // Restart GPS service
    if (isOnline) {
      gpsService.clearCache();
      // The useEffect will automatically restart GPS watching
    }
  };

  // Show loading state until hydrated
  if (!isHydrated) {
    return (
      <>
        <div className="w-full lg:w-1/2 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 md:p-10">
            <div className="text-center pt-10">
              <h1 className="text-2xl font-semibold">Loading...</h1>
              <p className="text-gray-500 mt-2 mb-6">
                Initializing driver interface...
              </p>
              <div className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg animate-pulse">
                Loading...
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

  return (
    <>
      {/* Left Half: UI Panel */}
      <div className="w-full lg:w-1/2 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-10">
          <div className="text-center pt-10">
            <h1 className="text-2xl font-semibold">
              {isOnline ? "You are Online" : "You are Offline"}
            </h1>
            <p className="text-gray-500 mt-2 mb-6">
              {isOnline ? "Searching for nearby trips..." : "You will not receive trip requests."}
            </p>
            
            {/* GPS Status Card */}
            {isOnline && (
              <GPSStatusCard 
                gpsStatus={gpsStatus}
                locationAccuracy={locationAccuracy}
                hasError={!!gpsError}
                onRetry={handleGPSRetry}
              />
            )}
            
            {/* Show offline message when not online */}
            {!isOnline && (
              <div className="mb-6 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
                📱 Go online to start receiving trip requests and enable GPS tracking
              </div>
            )}
            
            {/* Warning when GPS has error but trying to go online */}
            {gpsError && !isOnline && (
              <div className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                ⚠️ GPS needs to be working before you can go online. Please fix GPS issues first.
              </div>
            )}
            
            <OnlineOfflineToggle 
              isOnline={isOnline} 
              onToggle={handleToggleOnline}
              disabled={gpsError && !isOnline}
            />
            
            {/* Additional driver info when online with good GPS */}
            {isOnline && driverLocation && !gpsError && (
              <div className="mt-6 text-left bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">🚗 Driver Status</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>📍 Location: Tracking active</p>
                  <p>📡 GPS: {Math.round(locationAccuracy)}m accuracy</p>
                  <p>🔍 Status: Available for trips</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Half: Map Display */}
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
        <LeafletMap 
          pickup={driverLocation}
          drop={null}
          route={null}
          isInteractive={false}
        />
      </div>
    </>
  );
}

export default function DriverPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col lg:flex-row">
      <Suspense fallback={<div className="w-full flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
        <DriverPageContent />
      </Suspense>
    </main>
  );
}
