'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Inline RideBookingForm component with GPS functionality
function RideBookingForm() {
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
      console.error(`Geocoding error for "${address}":`, error.message);
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
      console.error('Address search error:', error);
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
        console.error('Search error:', error);
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

  // Simple GPS function (without the complex outdoor GPS service)
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
      
      // Get address name
      try {
        const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
        const data = await response.json();
        
        if (data && data.display_name) {
          const addressParts = data.display_name.split(',').map(part => part.trim());
          const cleanAddress = addressParts.slice(0, 3).join(', ');
          
          setPickupLocation(cleanAddress);
          setPickupCoords({ lat: latitude, lng: longitude });
          setLocationMessage('✅ Location found successfully!');
          setTimeout(() => setLocationMessage(''), 3000);
        } else {
          throw new Error('Could not get address');
        }
      } catch (geocodeError) {
        const fallbackAddress = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        setPickupLocation(fallbackAddress);
        setPickupCoords({ lat: latitude, lng: longitude });
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

  // Geocode pickup location
  useEffect(() => {
    const timeoutMs = isMobileDevice() ? 3000 : 2000;
    const handler = setTimeout(async () => {
      if (pickupLocation && !pickupLocation.includes('Current Location')) {
        const coords = await geocodeAddress(pickupLocation);
        setPickupCoords(coords);
      }
    }, timeoutMs);

    return () => clearTimeout(handler);
  }, [pickupLocation]);

  // Geocode drop location
  useEffect(() => {
    const timeoutMs = isMobileDevice() ? 3000 : 2000;
    const handler = setTimeout(async () => {
      if (dropLocation) {
        const coords = await geocodeAddress(dropLocation);
        setDropCoords(coords);
      }
    }, timeoutMs);

    return () => clearTimeout(handler);
  }, [dropLocation]);

  // Geocode stops
  useEffect(() => {
    const geocodeStops = async () => {
      const coords = await Promise.all(
        stops.map(async (stop, index) => {
          if (stop && stop.trim()) {
            const delay = isMobileDevice() ? index * 750 : index * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            const result = await geocodeAddress(stop);
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
  }, [stops]);

  // Calculate total distance
  useEffect(() => {
    calculateTotalDistance();
  }, [pickupCoords, dropCoords, stopCoords]);

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
        
        {!showManualEntry ? (
          <div className="relative">
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              onClick={handlePickupInputClick}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-white/10 bg-black/20 text-foreground placeholder-[color:var(--muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              placeholder="Click to use GPS or enter address"
              disabled={isLoadingLocation}
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[color:var(--muted)] hover:text-foreground disabled:opacity-50"
              title="Use GPS"
            >
              {isLoadingLocation ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        
        {isLoadingLocation && (
          <p className="text-xs text-[color:var(--muted)] mt-1">
            🛰️ Getting your location...
          </p>
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
            ✓ Location confirmed
          </p>
        )}
        
        {gpsError && !showManualEntry && (
          <div className="mt-2 text-xs text-yellow-400">
            💡 GPS not available. {' '}
            <button 
              onClick={() => setShowManualEntry(true)}
              className="underline hover:text-yellow-300"
            >
              Enter address manually
            </button>
          </div>
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
    </div>
  );
}

function RideOption({ title, description, price, icon, isPopular = false }) {
  return (
    <div className={`border rounded-lg p-6 relative ${isPopular ? 'border-primary bg-primary/5' : 'border-white/10'}`}>
      {isPopular && (
        <div className="absolute -top-3 left-4">
          <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-[color:var(--muted)] text-sm mt-1">{description}</p>
          <p className="text-foreground font-semibold mt-2">Starting at {price}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

export default function RiderPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-foreground">
            ← Back to overview
          </Link>
        </div>

        {/* Hero section */}
        <div className="card p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Ride with RideFlex Pro
              </h1>
              <p className="mt-4 text-[15px] text-[color:var(--muted)] max-w-lg">
                Book rides with confidence. Enjoy upfront pricing, quick pickups, 
                real-time tracking, and verified drivers every time.
              </p>

              {/* Dynamic form component */}
              <RideBookingForm />
            </div>

            {/* App preview */}
            <div className="relative mx-auto h-[400px] w-[300px]">
              <Image
                src="/assets/rider-app-preview.png"
                alt="RideFlex Pro rider app"
                fill
                sizes="300px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Why choose us */}
        <section className="card p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Why choose RideFlex Pro?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureItem
              icon="💰"
              title="Transparent pricing"
              description="Know your fare upfront with no hidden charges or surge surprises."
            />
            <FeatureItem
              icon="⚡"
              title="Quick pickups"
              description="Average pickup time under 5 minutes with live driver tracking."
            />
            <FeatureItem
              icon="🛡️"
              title="Safety first"
              description="All drivers verified with background checks and trip sharing."
            />
            <FeatureItem
              icon="📱"
              title="Easy booking"
              description="Book in seconds with saved locations and payment methods."
            />
            <FeatureItem
              icon="🎧"
              title="24/7 support"
              description="Get help anytime via in-app chat or phone support."
            />
            <FeatureItem
              icon="⭐"
              title="Top rated"
              description="Consistently rated 4.9/5 stars by riders across all cities."
            />
          </div>
        </section>

        {/* Ride options */}
        <section className="card p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Choose your ride</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RideOption
              icon="🚗"
              title="Saver"
              description="Affordable rides in compact cars. Perfect for solo trips."
              price="₹79"
            />
            <RideOption
              icon="🚙"
              title="Flex"
              description="Spacious sedans with priority pickup and ETA tracking."
              price="₹119"
              isPopular
            />
            <RideOption
              icon="🚘"
              title="Pro"
              description="Premium cars with top-rated drivers and enhanced comfort."
              price="₹179"
            />
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-6">What riders say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya M.",
                location: "Mumbai",
                rating: 5,
                text: "Pickup was exactly on time and the driver was professional. App made everything so easy!"
              },
              {
                name: "Arjun K.",
                location: "Bangalore",
                rating: 5,
                text: "Love the upfront pricing. No more fare surprises at the end of the trip."
              },
              {
                name: "Sneha R.",
                location: "Delhi",
                rating: 5,
                text: "Shared my trip with family for a late night ride. Felt safe and secure throughout."
              }
            ].map((review) => (
              <div key={review.name} className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-[color:var(--muted)] text-sm mb-3">&quot;{review.text}&quot;</p>
                <p className="text-sm font-semibold">{review.name}</p>
                <p className="text-xs text-[color:var(--muted)]">{review.location}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="card p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to ride?</h2>
          <p className="text-[color:var(--muted)] mb-6 max-w-2xl mx-auto">
            Download the RideFlex Pro app and book your first ride today. 
            New users get ₹100 off their first 3 rides.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book-ride" className="btn btn-primary">
              Book Your First Ride
            </Link>
            <Link href="/download" className="btn border border-white/10 hover:bg-white/5">
              Download App
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
