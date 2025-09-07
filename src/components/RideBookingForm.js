// src/components/RideBookingForm.js
'use client';
import { useState, useEffect, useCallback } from 'react';

export default function RideBookingForm() {
  const [mounted, setMounted] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [stops, setStops] = useState([]);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [stopCoords, setStopCoords] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile device detection helper
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Validate if coordinates are within India
  const isValidIndianCoords = (lat, lng) => {
    const minLat = 6.4627;
    const maxLat = 37.6;
    const minLng = 68.1766;
    const maxLng = 97.4025;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  };

  // Enhanced geocoding using proxy API
  const geocodeAddressOSM = useCallback(async (address, retryCount = 0) => {
    if (!address || address.length < 3) {
      return null;
    }

    const controller = new AbortController();
    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Use our proxy API instead of direct Nominatim call
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data && data.length > 0) {
        for (const location of data) {
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lon);
          
          if (isValidIndianCoords(lat, lng)) {
            console.log(`✓ Geocoded "${address}" to:`, {
              lat,
              lng,
              display_name: location.display_name
            });
            return { lat, lng, display_name: location.display_name };
          }
        }
      }

      console.warn(`❌ No valid results found for address: ${address}`);
      return null;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`⏱️ Request timeout for "${address}"`);
      } else {
        console.error(`🌐 Geocoding error for "${address}":`, error.message);
      }
      
      // Retry logic with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`🔄 Retrying geocoding for: ${address} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return geocodeAddressOSM(address, retryCount + 1);
      }
      
      return null;
    }
  }, []);

  // Update reverse geocoding to use proxy
  const reverseGeocodeOSM = async (lat, lng) => {
    const fallbackLocation = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    
    // Skip reverse geocoding on mobile to avoid issues
    if (isMobileDevice()) {
      console.log('Mobile detected - using coordinate-based location');
      return fallbackLocation;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return fallbackLocation;
      }

      const data = await response.json();

      if (data.error) {
        return fallbackLocation;
      }

      if (data && data.display_name) {
        const cleanAddress = data.display_name
          .split(',')
          .slice(0, 3)
          .join(', ')
          .trim();
        
        return cleanAddress || fallbackLocation;
      }
      
      return fallbackLocation;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Reverse geocoding error via proxy:', error.message);
      return fallbackLocation;
    }
  };

  // Distance calculation remains the same
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      console.error('Invalid coordinate types:', { lat1, lon1, lat2, lon2 });
      return 0;
    }

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error('NaN coordinates detected:', { lat1, lon1, lat2, lon2 });
      return 0;
    }

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    if (isNaN(distance) || !isFinite(distance)) {
      console.error('Invalid distance calculated:', distance);
      return 0;
    }

    return distance;
  };

  const calculateTotalDistance = useCallback(() => {
    if (!pickupCoords || !dropCoords) {
      setTotalDistance(null);
      setTotalDuration(null);
      return;
    }

    if (!pickupCoords.lat || !pickupCoords.lng || !dropCoords.lat || !dropCoords.lng) {
      console.error('Invalid pickup or drop coordinates:', { pickupCoords, dropCoords });
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    let totalDist = 0;
    let currentCoords = pickupCoords;
    const segments = [];
    
    console.log('📍 Starting distance calculation:');
    console.log('Pickup:', currentCoords);
    
    for (let i = 0; i < stopCoords.length; i++) {
      const stopCoord = stopCoords[i];
      if (stopCoord && stopCoord.lat && stopCoord.lng) {
        const segmentDistance = calculateDistance(
          currentCoords.lat, currentCoords.lng,
          stopCoord.lat, stopCoord.lng
        );
        
        segments.push({
          from: `(${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)})`,
          to: `Stop ${i + 1} (${stopCoord.lat.toFixed(4)}, ${stopCoord.lng.toFixed(4)})`,
          distance: segmentDistance.toFixed(2)
        });
        
        console.log(`📍 To stop ${i + 1}: ${segmentDistance.toFixed(2)}km`);
        totalDist += segmentDistance;
        currentCoords = stopCoord;
      }
    }
    
    const finalDistance = calculateDistance(
      currentCoords.lat, currentCoords.lng,
      dropCoords.lat, dropCoords.lng
    );
    
    segments.push({
      from: `(${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)})`,
      to: `Drop (${dropCoords.lat.toFixed(4)}, ${dropCoords.lng.toFixed(4)})`,
      distance: finalDistance.toFixed(2)
    });
    
    console.log(`📍 To drop: ${finalDistance.toFixed(2)}km`);
    totalDist += finalDistance;

    console.log('📊 Distance calculation summary:', segments);
    console.log(`🎯 Total distance: ${totalDist.toFixed(2)}km`);

    if (totalDist > 1000) {
      console.error('🚨 Total distance seems too large, check coordinates:', {
        pickup: pickupCoords,
        stops: stopCoords,
        drop: dropCoords,
        segments,
        totalDistance: totalDist
      });
      
      const coords = [pickupCoords, ...stopCoords, dropCoords];
      coords.forEach((coord, index) => {
        if (coord && !isValidIndianCoords(coord.lat, coord.lng)) {
          console.error(`🚨 Non-Indian coordinates detected at position ${index}:`, coord);
        }
      });
      
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    if (totalDist < 0.1) {
      console.warn('⚠️ Distance too small, might be duplicate coordinates');
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    setTotalDistance(totalDist.toFixed(2));
    setTotalDuration(Math.ceil((totalDist / 30) * 60));
  }, [pickupCoords, dropCoords, stopCoords]);

  // Enhanced geolocation with better mobile handling
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoadingLocation(true);

    const isMobile = isMobileDevice();
    const options = {
      enableHighAccuracy: true,
      timeout: isMobile ? 20000 : 15000,
      maximumAge: isMobile ? 600000 : 300000
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const address = await reverseGeocodeOSM(latitude, longitude);
          setPickupLocation(address);
          setPickupCoords({ lat: latitude, lng: longitude });
        } catch (error) {
          console.error('Error getting address:', error);
          const fallbackAddress = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setPickupLocation(fallbackAddress);
          setPickupCoords({ lat: latitude, lng: longitude });
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        let errorMessage = 'Unable to retrieve your location.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter your address manually.';
            break;
        }
        
        alert(errorMessage);
      },
      options
    );
  };

  // Enhanced debounced geocoding
  useEffect(() => {
    const timeoutMs = isMobileDevice() ? 3000 : 2000;
    const handler = setTimeout(async () => {
      if (pickupLocation && !pickupLocation.includes('Current Location')) {
        console.log('🔍 Geocoding pickup location:', pickupLocation);
        const coords = await geocodeAddressOSM(pickupLocation);
        setPickupCoords(coords);
      }
    }, timeoutMs);

    return () => clearTimeout(handler);
  }, [pickupLocation, geocodeAddressOSM]);

  useEffect(() => {
    const timeoutMs = isMobileDevice() ? 3000 : 2000;
    const handler = setTimeout(async () => {
      if (dropLocation) {
        console.log('🔍 Geocoding drop location:', dropLocation);
        const coords = await geocodeAddressOSM(dropLocation);
        setDropCoords(coords);
      }
    }, timeoutMs);

    return () => clearTimeout(handler);
  }, [dropLocation, geocodeAddressOSM]);

  // Geocode stops with mobile optimizations
  useEffect(() => {
    const geocodeStops = async () => {
      const coords = await Promise.all(
        stops.map(async (stop, index) => {
          if (stop && stop.trim()) {
            console.log(`🔍 Geocoding stop ${index + 1}:`, stop);
            const delay = isMobileDevice() ? index * 750 : index * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            const result = await geocodeAddressOSM(stop);
            return result;
          }
          return null;
        })
      );
      setStopCoords(coords.filter(coord => coord !== null));
    };

    if (stops.some(stop => stop.trim())) {
      const timeoutMs = isMobileDevice() ? 3000 : 2000;
      const handler = setTimeout(geocodeStops, timeoutMs);
      return () => clearTimeout(handler);
    } else {
      setStopCoords([]);
    }
  }, [stops, geocodeAddressOSM]);

  useEffect(() => {
    calculateTotalDistance();
  }, [calculateTotalDistance]);

  const handlePickupInputClick = () => {
    if (!pickupLocation) {
      getCurrentLocation();
    }
  };

  const addStop = () => {
    setStops([...stops, '']);
  };

  const removeStop = (index) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const updateStop = (index, value) => {
    const newStops = [...stops];
    newStops[index] = value;
    setStops(newStops);
  };

  const handleSelectCar = () => {
    if (!pickupLocation || !dropLocation) {
      alert('Please enter both pickup and drop locations.');
      return;
    }
    
    if (!pickupCoords || !dropCoords) {
      alert('Please wait while we locate your addresses...');
      return;
    }

    if (totalDistance === 'Error') {
      alert('There was an error calculating the route distance. Please check your locations and try again.');
      return;
    }

    try {
      const validStops = stops.filter(stop => stop && stop.trim() !== '');
      
      const searchParams = new URLSearchParams();
      searchParams.append('pickup', pickupLocation);
      searchParams.append('drop', dropLocation);
      searchParams.append('stops', JSON.stringify(validStops));
      searchParams.append('pickupLat', pickupCoords.lat.toString());
      searchParams.append('pickupLng', pickupCoords.lng.toString());
      searchParams.append('dropLat', dropCoords.lat.toString());
      searchParams.append('dropLng', dropCoords.lng.toString());
      searchParams.append('totalDistance', totalDistance || '0');
      searchParams.append('totalDuration', totalDuration || '0');
      
      const url = `/select-car?${searchParams.toString()}`;
      console.log('🚀 Navigating to:', url);
      
      window.location.href = url;
    } catch (error) {
      console.error('Error creating URL:', error);
      alert('Error processing your request. Please try again.');
    }
  };

  if (!mounted) {
    return (
      <div className="animate-pulse mt-8 space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Pickup location</label>
        <div className="relative">
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            onClick={handlePickupInputClick}
            className="w-full px-4 py-3 pr-12 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            placeholder="Click to use current location or enter address"
            disabled={isLoadingLocation}
          />
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[color:var(--muted)] hover:text-foreground disabled:opacity-50"
            title="Use current location"
          >
            {isLoadingLocation ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
              </svg>
            )}
          </button>
        </div>
        {isLoadingLocation && (
          <p className="text-xs text-[color:var(--muted)] mt-1">Getting your location...</p>
        )}
        {pickupCoords && (
          <p className="text-xs text-green-400 mt-1">✓ Location found</p>
        )}
      </div>

      {stops.map((stop, index) => (
        <div key={index} className="relative">
          <label className="block text-sm font-medium mb-2">Stop {index + 1}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={stop}
              onChange={(e) => updateStop(index, e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Add a stop location"
            />
            <button
              type="button"
              onClick={() => removeStop(index)}
              className="px-3 py-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove stop"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStop}
        className="w-full px-4 py-3 rounded-lg border border-white/10 text-[color:var(--muted)] hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span> Add Stop
      </button>

      <div>
        <label className="block text-sm font-medium mb-2">Drop location</label>
        <input
          type="text"
          value={dropLocation}
          onChange={(e) => setDropLocation(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Where are you going?"
        />
        {dropCoords && (
          <p className="text-xs text-green-400 mt-1">✓ Location found</p>
        )}
      </div>

      {totalDistance && (
        <div className={`rounded-lg p-4 ${totalDistance === 'Error' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
          <div className="flex justify-between text-sm">
            <span className="text-[color:var(--muted)]">Total Distance:</span>
            <span className={`font-semibold ${totalDistance === 'Error' ? 'text-red-400' : ''}`}>
              {totalDistance === 'Error' ? 'Calculation Error' : `${totalDistance} km`}
            </span>
          </div>
          {totalDistance !== 'Error' && (
            <>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[color:var(--muted)]">Estimated Duration:</span>
                <span className="font-semibold">{totalDuration} mins</span>
              </div>
              {stops.length > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[color:var(--muted)]">Stops:</span>
                  <span className="font-semibold">{stops.filter(s => s.trim()).length}</span>
                </div>
              )}
            </>
          )}
          {totalDistance === 'Error' && (
            <p className="text-red-400 text-xs mt-2">
              Please check that all locations are correctly spelled and exist in India.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSelectCar}
        className="btn btn-primary w-full"
        disabled={!pickupLocation || !dropLocation || !pickupCoords || !dropCoords || totalDistance === 'Error'}
      >
        Select Car
      </button>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-2 p-3 bg-gray-800 rounded">
          <p><strong>Pickup:</strong> {pickupCoords ? `${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)}` : 'None'}</p>
          <p><strong>Drop:</strong> {dropCoords ? `${dropCoords.lat.toFixed(4)}, ${dropCoords.lng.toFixed(4)}` : 'None'}</p>
          {stopCoords.length > 0 && (
            <p><strong>Stops:</strong> {stopCoords.map((coord, i) => `${i+1}: ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`).join(' | ')}</p>
          )}
          <p><strong>All coords valid Indian locations:</strong> {
            [pickupCoords, ...stopCoords, dropCoords]
              .filter(Boolean)
              .every(coord => isValidIndianCoords(coord.lat, coord.lng)) ? '✅' : '❌'
          }</p>
        </div>
      )}
    </div>
  );
}
