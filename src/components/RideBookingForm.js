// components/RideBookingForm.js - COORDINATES PROTECTION VERSION
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RideBookingForm() {
  const router = useRouter();
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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [isGeocodingDrop, setIsGeocodingDrop] = useState(false);
  
  // Protection flags - Prevent coordinate overwriting
  const [pickupCoordsLocked, setPickupCoordsLocked] = useState(false);
  const [dropCoordsLocked, setDropCoordsLocked] = useState(false);

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

  // Basic geocoding using your API
  const geocodeAddress = async (address) => {
    if (!address || address.length < 3) {
      return null;
    }

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`, {
        headers: {
          'Accept': 'application/json',
        }
      });

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
            return { lat, lng, display_name: location.display_name };
          }
        }
      }

      return null;
      
    } catch (error) {
      return null;
    }
  };

  // Distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return 0;
    }

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
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
      return 0;
    }

    return distance;
  };

  const calculateTotalDistance = () => {
    if (!pickupCoords || !dropCoords) {
      setTotalDistance(null);
      setTotalDuration(null);
      return;
    }

    if (!pickupCoords.lat || !pickupCoords.lng || !dropCoords.lat || !dropCoords.lng) {
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    let totalDist = 0;
    let currentCoords = pickupCoords;
    
    for (let i = 0; i < stopCoords.length; i++) {
      const stopCoord = stopCoords[i];
      if (stopCoord && stopCoord.lat && stopCoord.lng) {
        const segmentDistance = calculateDistance(
          currentCoords.lat, currentCoords.lng,
          stopCoord.lat, stopCoord.lng
        );
        
        totalDist += segmentDistance;
        currentCoords = stopCoord;
      }
    }
    
    const finalDistance = calculateDistance(
      currentCoords.lat, currentCoords.lng,
      dropCoords.lat, dropCoords.lng
    );
    
    totalDist += finalDistance;

    if (totalDist > 1000) {
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    if (totalDist < 0.1) {
      setTotalDistance('Error');
      setTotalDuration('Error');
      return;
    }

    setTotalDistance(totalDist.toFixed(2));
    setTotalDuration(Math.ceil((totalDist / 30) * 60));
  };

  // Search address for manual entry
  const searchAddress = async (query) => {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.error) return [];
      
      return data.slice(0, 5).map(result => ({
        display_name: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }));
    } catch (error) {
      return [];
    }
  };

  // Manual location entry component
  const ManualLocationEntry = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (query) => {
      setSearchTerm(query);
      
      if (query.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchAddress(query);
        setSearchResults(results);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const selectAddress = (result) => {
      setPickupLocation(result.display_name);
      setPickupCoords({
        lat: result.lat,
        lng: result.lng
      });
      setPickupCoordsLocked(true); // Lock pickup coordinates
      setShowManualEntry(false);
      setSearchResults([]);
      setLocationMessage('✅ Address selected successfully!');
      
      setTimeout(() => setLocationMessage(''), 3000);
    };

    return (
      <div className="manual-entry bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📍 Enter Your Address</h3>
        
        {gpsError && gpsError.includes('GPS_') && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-1">📡 GPS Guidance</h4>
            <p className="text-sm text-yellow-700 mb-2">
              For best results, go outdoors and try GPS again, or enter your address below.
            </p>
            <button
              onClick={() => {
                setShowManualEntry(false);
                setGpsError(null);
                setLocationMessage('');
              }}
              className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700"
            >
              🛰️ Try GPS Again (Outdoors)
            </button>
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type your address (e.g., Street name, Colony, City)"
            className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
          
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectAddress(result)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-blue-100 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-900">
                  📍 {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setShowManualEntry(false);
              setGpsError(null);
              setLocationMessage('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to GPS
          </button>
        </div>
      </div>
    );
  };

  // GPS function - Locks coordinates immediately after fetching
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoadingLocation(true);
    setGpsError(null);
    setLocationMessage('');

    try {
      setLocationMessage('📱 Getting your location...');
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 30000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Immediately lock GPS coordinates
      const finalCoords = { lat: latitude, lng: longitude };
      setPickupCoords(finalCoords);
      setPickupCoordsLocked(true); // Prevent any future changes
      
      // Get address name
      try {
        const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
        const data = await response.json();
        
        if (data && data.display_name) {
          const addressParts = data.display_name.split(',').map(part => part.trim());
          const cleanAddress = addressParts.slice(0, 3).join(', ');
          
          setPickupLocation(cleanAddress);
          setLocationMessage('✅ Location found successfully!');
          setTimeout(() => setLocationMessage(''), 3000);
        } else {
          throw new Error('Could not get address');
        }
      } catch (geocodeError) {
        const fallbackAddress = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        setPickupLocation(fallbackAddress);
        setLocationMessage('✅ GPS location found!');
        setTimeout(() => setLocationMessage(''), 3000);
      }
      
    } catch (error) {
      setLocationMessage('🏠 GPS not available. Please enter address manually.');
      setGpsError(error.message);
      setShowManualEntry(true);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Manual drop location geocoding - Only when user clicks button
  const handleDropLocationGeocode = async () => {
    if (!dropLocation || dropLocation.trim().length < 3) {
      alert('Please enter a valid drop location');
      return;
    }

    if (dropCoordsLocked) {
      return;
    }

    setIsGeocodingDrop(true);
    
    try {
      const coords = await geocodeAddress(dropLocation);
      if (coords) {
        setDropCoords(coords);
        setDropCoordsLocked(true); // Lock drop coordinates
      } else {
        alert('Could not find location. Please check spelling and try again.');
      }
    } catch (error) {
      alert('Error finding location. Please try again.');
    } finally {
      setIsGeocodingDrop(false);
    }
  };

  // Only keep distance calculation
  useEffect(() => {
    calculateTotalDistance();
  }, [pickupCoords, dropCoords, stopCoords]);

  const handlePickupInputClick = () => {
    if (!pickupLocation && !pickupCoordsLocked) {
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

  // Enhanced handleSelectCar with coordinate protection
  const handleSelectCar = async () => {
    // Step 1: Basic validation
    if (!pickupLocation || !dropLocation) {
      alert('Please enter both pickup and drop locations.');
      return;
    }
    
    if (!pickupCoords) {
      alert('Please get your pickup location first by clicking the GPS button.');
      return;
    }

    // Step 2: Ensure drop location is geocoded
    if (!dropCoords) {
      alert('Please geocode your drop location by clicking "Find Location" button.');
      return;
    }

    if (totalDistance === 'Error') {
      alert('There was an error calculating the route distance. Please check your locations and try again.');
      return;
    }

    try {
      const validStops = stops.filter(stop => stop && stop.trim() !== '');
      
      // Step 3: Create parameters with coordinate protection
      const params = {
        pickup: pickupLocation,
        drop: dropLocation,
        stops: JSON.stringify(validStops),
        pickupLat: pickupCoords.lat.toString(),
        pickupLng: pickupCoords.lng.toString(),
        dropLat: dropCoords.lat.toString(),
        dropLng: dropCoords.lng.toString(),
        totalDistance: totalDistance || '0',
        totalDuration: totalDuration || '0'
      };

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      
      const url = `/select-car?${searchParams.toString()}`;
      
      router.push(url);
      
    } catch (error) {
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
        
        {!showManualEntry ? (
          <div className="relative">
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => {
                if (!pickupCoordsLocked) {
                  setPickupLocation(e.target.value);
                }
              }}
              onClick={handlePickupInputClick}
              className={`w-full px-4 py-3 pr-12 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${pickupCoordsLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
              placeholder="Click to use GPS or enter address"
              disabled={isLoadingLocation || pickupCoordsLocked}
              readOnly={pickupCoordsLocked}
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation || pickupCoordsLocked}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[color:var(--muted)] hover:text-foreground disabled:opacity-50"
              title={pickupCoordsLocked ? "Location locked" : "Use GPS"}
            >
              {isLoadingLocation ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : pickupCoordsLocked ? (
                <span className="text-green-400">🔒</span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <ManualLocationEntry />
        )}
        
        {locationMessage && (
          <p className={`text-xs mt-1 ${
            locationMessage.includes('✅') ? 'text-green-400' : 
            locationMessage.includes('🏠') ? 'text-blue-400' : 
            'text-[color:var(--muted)]'
          }`}>
            {locationMessage}
          </p>
        )}
        
        {pickupCoords && (
          <p className="text-xs text-green-400 mt-1">
            🔒 Pickup locked: {pickupCoords.lat.toFixed(6)}, {pickupCoords.lng.toFixed(6)}
          </p>
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
        <div className="flex gap-2">
          <input
            type="text"
            value={dropLocation}
            onChange={(e) => {
              if (!dropCoordsLocked) {
                setDropLocation(e.target.value);
              }
            }}
            className={`flex-1 px-4 py-3 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${dropCoordsLocked ? 'opacity-75' : ''}`}
            placeholder="Where are you going?"
            disabled={dropCoordsLocked}
          />
          <button
            type="button"
            onClick={handleDropLocationGeocode}
            disabled={isGeocodingDrop || !dropLocation.trim() || dropCoordsLocked}
            className="px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={dropCoordsLocked ? "Location locked" : "Find location"}
          >
            {isGeocodingDrop ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : dropCoordsLocked ? (
              '🔒'
            ) : (
              '🔍'
            )}
            {dropCoordsLocked ? 'Locked' : 'Find'}
          </button>
        </div>
        
        {dropCoords && (
          <p className="text-xs text-green-400 mt-1">
            🔒 Drop locked: {dropCoords.lat.toFixed(6)}, {dropCoords.lng.toFixed(6)}
          </p>
        )}
        {dropLocation && !dropCoords && !isGeocodingDrop && !dropCoordsLocked && (
          <p className="text-xs text-blue-400 mt-1">💡 Click "Find" to get coordinates</p>
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
        </div>
      )}

      <button
        onClick={handleSelectCar}
        className="btn btn-primary w-full"
        disabled={!pickupLocation || !dropLocation || !pickupCoords || !dropCoords || totalDistance === 'Error'}
      >
        Select Routes
      </button>

      {/* Protection Status */}
      <div className="text-xs text-gray-400 space-y-1">
        <div>🔒 Pickup: {pickupCoordsLocked ? '✅ Locked' : '❌ Not set'} | Drop: {dropCoordsLocked ? '✅ Locked' : '❌ Not set'}</div>
      </div>
    </div>
  );
}
