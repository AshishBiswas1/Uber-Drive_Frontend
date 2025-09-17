// SelectCarPage.js
'use client';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { gpsService } from '../../utils/gpsService';

// Use Google Maps component with singleton loader
const GoogleMap = dynamic(() => import('../../components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Loading fresh Google Maps...</p>
    </div>
  )
});

// Simple icon components using CSS/Unicode
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

function SelectCarContent() {
  const searchParams = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Loading fresh data...');
  const [tripDetails, setTripDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [locationSource, setLocationSource] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

  // **FORCE FRESH GEOCODING - No cache allowed**
  const forceGeocodeAddress = async (address, biasLocation = null) => {
    try {
      console.log('🔄 FORCE FRESH geocoding (no cache):', address);
      
      // **Clear any cached data first**
      gpsService.clearCache();
      
      const biasAt = biasLocation ? [biasLocation.lat, biasLocation.lng] : null;
      const results = await gpsService.searchAddress(address, biasAt);
      
      if (results && results.length > 0) {
        console.log('✅ Fresh geocode result:', results[0]);
        return {
          lat: results[0].lat,
          lng: results[0].lng,
          source: results[0].source
        };
      }
    } catch (error) {
      console.error('Fresh geocoding error for:', address, error);
    }
    return null;
  };

  // **ENSURE GOOGLE MAPS IS READY**
  useEffect(() => {
    const checkGoogleMapsReady = async () => {
      try {
        // Initialize Google Maps through gpsService (which uses singleton loader)
        const isReady = await gpsService.initGoogleMaps();
        setIsGoogleMapsReady(isReady);
        console.log('🗺️ Google Maps ready status:', isReady);
      } catch (error) {
        console.error('Google Maps initialization error:', error);
        setIsGoogleMapsReady(false);
      }
    };

    checkGoogleMapsReady();
  }, []);

  // **ENHANCED PARAMETER PROCESSING WITH DEBUGGING**
  useEffect(() => {
    // Only process trip data when Google Maps is ready
    if (!isGoogleMapsReady) return;

    const processFreshTripData = async () => {
      setIsProcessing(true);
      
      // **STEP 1: DEBUG ALL RECEIVED PARAMETERS**
      console.group('🔍 SELECT-CAR PARAMETER DEBUG');
      console.log('📋 ALL URL SEARCH PARAMS:');
      
      // Get all parameters and log them
      const allParams = {};
      for (const [key, value] of searchParams.entries()) {
        allParams[key] = value;
        console.log(`  ${key}: "${value}" (type: ${typeof value}, length: ${value?.length || 0})`);
      }
      
      console.table(allParams);
      
      // **STEP 2: EXTRACT PARAMETERS WITH DETAILED LOGGING**
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
      
      console.log('📊 EXTRACTED PARAMETERS:');
      console.log('  pickup:', pickup, '(valid:', !!pickup, ')');
      console.log('  drop:', drop, '(valid:', !!drop, ')');
      console.log('  pickupLat:', pickupLat, '(valid:', !!pickupLat, ')');
      console.log('  pickupLng:', pickupLng, '(valid:', !!pickupLng, ')');
      console.log('  dropLat:', dropLat, '(valid:', !!dropLat, ')');
      console.log('  dropLng:', dropLng, '(valid:', !!dropLng, ')');
      console.log('  totalDistance:', totalDistance);
      console.log('  totalDuration:', totalDuration);
      console.log('  stops:', stops);
      console.log('  accuracy:', accuracy);
      
      // **STEP 3: VALIDATION WITH DETAILED FEEDBACK**
      const missingParams = [];
      if (!pickup) missingParams.push('pickup');
      if (!drop) missingParams.push('drop');
      if (!pickupLat) missingParams.push('pickupLat');
      if (!pickupLng) missingParams.push('pickupLng');
      if (!dropLat) missingParams.push('dropLat');
      if (!dropLng) missingParams.push('dropLng');
      
      console.log('❓ MISSING PARAMETERS:', missingParams);
      console.log('🔗 CURRENT URL:', window.location.href);
      console.groupEnd();

      // **VALIDATION: Ensure we have fresh coordinates**
      if (missingParams.length > 0) {
        console.error('❌ MISSING FRESH COORDINATES:', missingParams);
        console.error('📋 Available params:', Object.keys(allParams));
        console.error('🔗 Current URL:', window.location.href);
        
        setCurrentLocationName(`Missing parameters: ${missingParams.join(', ')} - please get new GPS location`);
        setIsProcessing(false);
        
        // **HELPFUL ERROR MESSAGE**
        alert(`Missing required parameters: ${missingParams.join(', ')}\n\nPlease go back and ensure your pickup location has GPS coordinates.`);
        return;
      }

      // **FORCE CLEAR ALL CACHES**
      console.log('🧹 CLEARING ALL CACHED DATA for fresh trip processing...');
      gpsService.clearCache();
      
      // **Clear browser storage caches that might interfere**
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('trip-cache');
          sessionStorage.removeItem('location-cache');
          localStorage.removeItem('trip-coordinates');
          console.log('🧹 Browser storage caches cleared');
        } catch (error) {
          console.warn('Cache clear warning:', error);
        }
      }

      console.log('🚗 Processing FRESH trip data (no cache)...');
      
      // **Get fresh timestamp to force uniqueness**
      const timestamp = Date.now();
      setDataTimestamp(timestamp);

      // **PARSE FRESH COORDINATES (force to high precision)**
      const pickupLocation = {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng)
      };

      const dropLocation = {
        lat: parseFloat(dropLat),
        lng: parseFloat(dropLng)
      };

      // **VALIDATE COORDINATE FRESHNESS (check if they're reasonable)**
      console.log('🔍 Validating fresh coordinate precision...');
      const pickupPrecision = pickupLat.split('.')[1]?.length || 0;
      const pickupLngPrecision = pickupLng.split('.')[1]?.length || 0;
      
      if (pickupPrecision < 6 || pickupLngPrecision < 6) {
        console.warn('⚠️ Low precision coordinates detected - may be cached data');
        setLocationSource('⚠️ Low Precision GPS');
      } else {
        console.log('✅ High precision coordinates confirmed (6+ decimal places)');
        setLocationSource('🎯 High Precision GPS');
      }

      // **SET FRESH LOCATION DATA**
      setCurrentLocation(pickupLocation);
      setCurrentLocationName(pickup);
      
      // **PROCESS GPS ACCURACY**
      if (accuracy) {
        const gpsAcc = parseFloat(accuracy);
        setGpsAccuracy(gpsAcc);
        const accuracyStatus = gpsService.getAccuracyStatus(gpsAcc);
        setLocationSource(`🎯 Fresh ${accuracyStatus} GPS`);
      }

      console.log('✅ Using FRESH coordinates (timestamp:', timestamp, '):', {
        pickup: pickupLocation,
        drop: dropLocation,
        accuracy: accuracy ? `±${Math.round(parseFloat(accuracy))}m` : 'N/A',
        precision: `${pickupPrecision} decimal places`
      });

      // **FORCE FRESH STOP PROCESSING**
      let stopsData = [];
      let stopCoordinates = [];
      
      if (stops) {
        try {
          const stopsArray = JSON.parse(stops);
          stopsData = stopsArray.filter(stop => stop && stop.trim());
          
          if (stopsData.length > 0) {
            console.log('🔄 FORCE FRESH geocoding for stops (no cache)...');
            
            // **PARALLEL FRESH GEOCODING**
            const geocodePromises = stopsData.map(async (stop, index) => {
              // Add small delay to ensure fresh requests
              await new Promise(resolve => setTimeout(resolve, index * 100));
              
              const coords = await forceGeocodeAddress(stop, pickupLocation);
              return coords ? {
                name: stop,
                ...coords,
                timestamp: Date.now() // Track freshness
              } : null;
            });
            
            stopCoordinates = (await Promise.all(geocodePromises)).filter(Boolean);
            console.log('✅ FRESH stops processed:', stopCoordinates);
          }
        } catch (error) {
          console.error('Error parsing stops:', error);
        }
      }

      // **SET COMPREHENSIVE FRESH TRIP DETAILS**
      const freshTripDetails = {
        pickup: pickupLocation,
        drop: dropLocation,
        pickupName: pickup,
        dropName: drop,
        totalDistance: totalDistance || 'Unknown',
        totalDuration: totalDuration || 'Unknown',
        stops: stopsData,
        stopCoordinates: stopCoordinates,
        locationSource: locationSource,
        gpsAccuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: timestamp, // Track data freshness
        coordinatePrecision: pickupPrecision,
        dataFreshness: 'FRESH' // Mark as fresh data
      };

      setTripDetails(freshTripDetails);

      console.log('🎯 FRESH trip data ready for Google Maps display');
      setIsProcessing(false);
    };

    processFreshTripData();
  }, [searchParams, isGoogleMapsReady]);

  // **FORCE FRESH MAP RENDERING**
  const mapKey = `fresh-map-${dataTimestamp}-${isGoogleMapsReady}`;

  // Show loading while Google Maps is initializing or processing fresh data
  if (!isGoogleMapsReady || isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isGoogleMapsReady ? 'Initializing Google Maps...' : 'Processing fresh Google Places data...'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {!isGoogleMapsReady ? 'Loading singleton Google Maps API' : 'Clearing all cached data for accuracy'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Simplified */}
      <div className="w-full lg:w-2/5 bg-white shadow-lg overflow-y-auto flex-shrink-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Link href="/" className="mr-4">
              <ChevronLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Choose the Ride</h1>
          </div>

          {/* Trip Summary */}
          {tripDetails && (
            <div className="mb-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium text-gray-900 text-right flex-1 ml-4 truncate">
                    {tripDetails.pickupName}
                  </span>
                </div>
                
                {tripDetails.stops && tripDetails.stops.length > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Via:</span>
                    <span className="font-medium text-gray-900 text-right flex-1 ml-4 truncate">
                      {tripDetails.stops.join(', ')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium text-gray-900 text-right flex-1 ml-4 truncate">
                    {tripDetails.dropName}
                  </span>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-semibold text-gray-900">
                    {tripDetails.totalDistance !== 'Unknown' ? `${tripDetails.totalDistance} km` : 'Calculating...'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="font-semibold text-gray-900">
                    {tripDetails.totalDuration !== 'Unknown' ? `${tripDetails.totalDuration} mins` : 'Calculating...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Rides Available Message */}
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rides Available</h3>
              <p className="text-gray-600 text-sm max-w-sm mx-auto">
                We're currently working on bringing ride options to your area. 
                Please check back later or try a different route.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link 
                href="/"
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Different Route
              </Link>
              
              <button 
                onClick={() => window.location.reload()}
                className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Status Footer */}
          {tripDetails && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Map Status:</span>
                  <span className="text-green-600">✅ Ready</span>
                </div>
                <div className="flex justify-between">
                  <span>Trip Data:</span>
                  <span className="text-green-600">Fresh ({new Date(dataTimestamp).toLocaleTimeString()})</span>
                </div>
                {gpsAccuracy && (
                  <div className="flex justify-between">
                    <span>GPS Accuracy:</span>
                    <span className="text-green-600">±{Math.round(gpsAccuracy)}m</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - FULL PAGE HEIGHT Google Maps */}
      <div className="flex-1 h-full">
        {isGoogleMapsReady && (
          <GoogleMap
            key={mapKey} // Force fresh map rendering
            pickup={currentLocation}
            drop={tripDetails?.drop || null}
            stops={tripDetails?.stopCoordinates || []}
            route={null}
            isInteractive={true}
            userType="rider"
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
          <p>Loading trip data...</p>
        </div>
      </div>
    }>
      <SelectCarContent />
    </Suspense>
  );
}
