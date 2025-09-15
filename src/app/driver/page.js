'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { gpsService } from '../../utils/gpsService';
import { googleMapsLoader } from '../../utils/googleMapsLoader';

// Use singleton Google Maps loader
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

function GPSStatusCard({ gpsStatus, locationAccuracy, hasError, onRetry, coordinates }) {
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
          {coordinates && (
            <p className="text-xs mt-1 opacity-75 font-mono">
              📍 {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

  // **INITIALIZE GOOGLE MAPS SINGLETON SILENTLY**
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // Use singleton loader to prevent multiple script loads
        await googleMapsLoader.loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
        
        if (googleMapsLoader.isGoogleMapsLoaded()) {
          setIsGoogleMapsReady(true);
          console.log('✅ Driver page: Google Maps singleton ready (silent)');
        }
      } catch (error) {
        console.error('❌ Driver page: Google Maps initialization error:', error);
        setIsGoogleMapsReady(false);
      }
    };

    initializeGoogleMaps();
  }, []);

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

  // **ENHANCED GPS WITH SAME METHOD AS RIDEBOOKING FORM**
  useEffect(() => {
    if (!isOnline || !isHydrated || !isGoogleMapsReady) {
      setDriverLocation(null);
      setLocationAccuracy(null);
      setGpsStatus('Offline');
      setGpsError(null);
      return;
    }

    setIsGettingLocation(true);
    setGpsStatus('🛰️ Getting GPS location...');
    setGpsError(null);
    
    // **ENHANCED GPS ACQUISITION (same as RideBookingForm)**
    const getEnhancedGPS = async () => {
      try {
        console.log('🚀 Driver GPS acquisition (same as RideBookingForm)...');
        
        // **CLEAR GPS CACHE FOR FRESH READING**
        gpsService.clearCache();
        
        // **MULTIPLE GPS ATTEMPTS FOR BEST ACCURACY**
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
                  enableHighAccuracy: attempt === 2, // **First quick, second accurate**
                  maximumAge: 0, // **NO CACHE**
                  timeout: attempt === 1 ? 10000 : 15000
                }
              );
            });

            console.log(`📡 Driver Attempt ${attempt}: ±${position.coords.accuracy}m at ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);

            // **KEEP MOST ACCURATE READING**
            if (position.coords.accuracy < bestAccuracy) {
              bestPosition = position;
              bestAccuracy = position.coords.accuracy;
              console.log(`✅ Driver: New best accuracy: ±${bestAccuracy}m`);
            }

            // **EXCELLENT ACCURACY EARLY EXIT**
            if (bestAccuracy <= 20) {
              console.log(`🎯 Driver: Excellent accuracy achieved early: ±${bestAccuracy}m`);
              break;
            }

            // **BRIEF PAUSE BETWEEN ATTEMPTS**
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

        // **SET DRIVER COORDINATES**
        const driverCoords = {
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude
        };
        
        setDriverLocation(driverCoords);
        setLocationAccuracy(bestPosition.coords.accuracy);
        
        // **🔥 ENHANCED CONSOLE LOG - DRIVER COORDINATES 🔥**
        console.log('🚗📍 DRIVER PAGE - COORDINATES FETCHED:');
        console.log('=====================================');
        console.log('📍 DRIVER GPS COORDINATES:');
        console.log(`   Latitude:  ${driverCoords.lat}`);
        console.log(`   Longitude: ${driverCoords.lng}`);
        console.log(`   Precision: ${driverCoords.lat.toFixed(8)}, ${driverCoords.lng.toFixed(8)}`);
        console.log(`   Accuracy:  ±${Math.round(bestPosition.coords.accuracy)}m`);
        console.log(`   Status:    ${gpsService.getAccuracyStatus(bestPosition.coords.accuracy)}`);
        console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
        console.log(`   Source:    Driver Page GPS (same method as RideBookingForm)`);
        console.log('=====================================');

        const accuracyStatus = gpsService.getAccuracyStatus(bestPosition.coords.accuracy);
        let statusEmoji = '';
        switch (accuracyStatus) {
          case 'Excellent': statusEmoji = '🎯'; break;
          case 'Very Good': statusEmoji = '✅'; break;
          case 'Good': statusEmoji = '✅'; break;
          case 'Fair': statusEmoji = '⚠️'; break;
          case 'City-level': statusEmoji = '🏙️'; break;
          case 'Area-level': statusEmoji = '🗺️'; break;
          default: statusEmoji = '📍'; break;
        }
        
        setGpsStatus(`${statusEmoji} GPS ${accuracyStatus} - Driver Location Active`);
        setGpsError(null);
        
        console.log(`✅ Driver GPS success: ${accuracyStatus} (±${Math.round(bestPosition.coords.accuracy)}m)`);

      } catch (error) {
        console.error('❌ Driver GPS failed:', error);
        handleGPSError(error);
      } finally {
        setIsGettingLocation(false);
      }
    };

    const handleGPSError = (error) => {
      // **ENHANCED ERROR LOGGING**
      console.log('❌📍 DRIVER PAGE - GPS FAILED:');
      console.log('=====================================');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code:  ${error.code || 'N/A'}`);
      console.log(`   Time:  ${new Date().toLocaleTimeString()}`);
      console.log('=====================================');
      
      let userFriendlyMessage = '';
      let troubleshootingMessage = '';
      
      if (error.code === 1 || error.message.includes('denied')) {
        userFriendlyMessage = '❌ Location Access Denied';
        troubleshootingMessage = 'Please enable location permissions in your browser settings and refresh the page.';
      } else if (error.code === 2 || error.message.includes('unavailable')) {
        userFriendlyMessage = '📡 GPS Satellites Unavailable';
        troubleshootingMessage = 'Move to an outdoor area with clear sky visibility for better GPS reception.';
      } else if (error.code === 3 || error.message.includes('timeout')) {
        userFriendlyMessage = '⏱️ GPS Timeout';
        troubleshootingMessage = 'GPS is taking too long. Try moving outdoors and ensure location services are enabled.';
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
    };

    // Start enhanced GPS acquisition
    getEnhancedGPS();

    // **CONTINUOUS TRACKING: Simple watchPosition for updates**
    let watchId = null;
    const startWatching = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            // Only update if significantly different or more accurate
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            const newAccuracy = position.coords.accuracy;
            
            if (!driverLocation || 
                Math.abs(newLat - driverLocation.lat) > 0.0001 || 
                Math.abs(newLng - driverLocation.lng) > 0.0001 ||
                newAccuracy < (locationAccuracy || Infinity) * 0.8) {
              
              const updatedLocation = { lat: newLat, lng: newLng };
              setDriverLocation(updatedLocation);
              setLocationAccuracy(newAccuracy);
              
              console.log(`📍 Driver location updated: ${newLat.toFixed(6)}, ${newLng.toFixed(6)} (±${Math.round(newAccuracy)}m)`);
            }
          },
          (error) => {
            console.warn('📡 Watch GPS error:', error.message);
            // Don't show errors for continuous watching
          },
          {
            enableHighAccuracy: false, // **FASTER: Use network location for updates**
            maximumAge: 30000,
            timeout: 15000
          }
        );
      }
    };

    // Start watching after initial location
    setTimeout(startWatching, 5000);

    return () => {
      if (watchId && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, isHydrated, isGoogleMapsReady]);

  const handleToggleOnline = () => {
    if (gpsError && !isOnline) {
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
    console.log('🔄 DRIVER PAGE - GPS RETRY INITIATED');
    console.log('=====================================');
    console.log('   Action: Retrying GPS with enhanced method');
    console.log('   Time:   ' + new Date().toLocaleTimeString());
    console.log('=====================================');
    
    setGpsError(null);
    setGpsStatus('🛰️ Retrying GPS...');
    
    // Force reload by toggling online status
    setIsOnline(false);
    setTimeout(() => setIsOnline(true), 500);
  };

  // Show loading state until hydrated AND Google Maps ready
  if (!isHydrated || !isGoogleMapsReady) {
    return (
      <>
        <div className="w-full lg:w-1/2 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 md:p-10">
            <div className="text-center pt-10">
              <h1 className="text-2xl font-semibold">Loading...</h1>
              <p className="text-gray-500 mt-2 mb-6">
                {!isHydrated ? 'Initializing driver interface...' : 'Initializing Google Maps...'}
              </p>
              <div className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg animate-pulse">
                {!isHydrated ? 'Loading...' : 'Google Maps Loading...'}
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
      {/* Left Half: UI Panel - EXACT ORIGINAL */}
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
                coordinates={driverLocation}
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
            
            {/* Loading state */}
            {isGettingLocation && (
              <div className="mb-6 text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Getting your location with enhanced GPS...</span>
              </div>
            )}
            
            <OnlineOfflineToggle 
              isOnline={isOnline} 
              onToggle={handleToggleOnline}
              disabled={(gpsError && !isOnline) || isGettingLocation}
            />
            
            {/* Additional driver info when online with good GPS */}
            {isOnline && driverLocation && !gpsError && (
              <div className="mt-6 text-left bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">🚗 Driver Status</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>📍 Location: Enhanced GPS tracking active</p>
                  <p>📡 GPS: {Math.round(locationAccuracy)}m accuracy</p>
                  <p>🔍 Status: Available for trips</p>
                  <p className="font-mono text-xs">
                    {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    🔍 Check console for detailed coordinate logs
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Half: Map Display - EXACT ORIGINAL */}
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
        <LeafletMap 
          key={`driver-map-${driverLocation ? driverLocation.lat + driverLocation.lng : 'no-location'}`}
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
