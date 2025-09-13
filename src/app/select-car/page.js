'use client';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const LeafletMap = dynamic(() => import('../../components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse flex items-center justify-center"><p className="text-gray-500">Loading Map...</p></div>
});

// Simple icon components using CSS/Unicode
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function SelectCarContent() {
  const searchParams = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Loading...');
  const [tripDetails, setTripDetails] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Geocode a single address to get coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      }
    } catch (error) {
      console.error('Geocoding error for:', address, error);
    }
    return null;
  };

  // Get trip details from URL parameters (from RideBookingForm)
  useEffect(() => {
    const processTripData = async () => {
      // Extract coordinates and location details from URL parameters
      const pickup = searchParams.get('pickup');
      const drop = searchParams.get('drop');
      const pickupLat = searchParams.get('pickupLat');
      const pickupLng = searchParams.get('pickupLng');
      const dropLat = searchParams.get('dropLat');
      const dropLng = searchParams.get('dropLng');
      const totalDistance = searchParams.get('totalDistance');
      const totalDuration = searchParams.get('totalDuration');
      const stops = searchParams.get('stops');

      if (pickup && drop && pickupLat && pickupLng && dropLat && dropLng) {
        // Use coordinates from RideBookingForm
        const pickupLocation = {
          lat: parseFloat(pickupLat),
          lng: parseFloat(pickupLng)
        };

        const dropLocation = {
          lat: parseFloat(dropLat),
          lng: parseFloat(dropLng)
        };

        // Process stops - geocode them to get coordinates
        let stopsData = [];
        let stopCoordinates = [];
        
        if (stops) {
          try {
            const stopsArray = JSON.parse(stops);
            stopsData = stopsArray.filter(stop => stop && stop.trim());
            
            // Geocode each stop to get coordinates
            console.log('🗺️ Geocoding stops:', stopsData);
            for (const stop of stopsData) {
              const coords = await geocodeAddress(stop);
              if (coords) {
                stopCoordinates.push({
                  name: stop,
                  ...coords
                });
              }
            }
            console.log('✅ Stop coordinates:', stopCoordinates);
          } catch (error) {
            console.error('Error parsing stops:', error);
          }
        }

        // Set current location to pickup location from form
        setCurrentLocation(pickupLocation);
        setCurrentLocationName(pickup);

        // Set trip details including stop coordinates
        setTripDetails({
          pickup: pickupLocation,
          drop: dropLocation,
          pickupName: pickup,
          dropName: drop,
          totalDistance: totalDistance || 'Unknown',
          totalDuration: totalDuration || 'Unknown',
          stops: stopsData,
          stopCoordinates: stopCoordinates
        });

        console.log('✅ Using coordinates from RideBookingForm:', {
          pickup: pickupLocation,
          drop: dropLocation,
          pickupName: pickup,
          dropName: drop,
          stops: stopsData,
          stopCoordinates: stopCoordinates
        });
      } else {
        // Fallback: If no coordinates provided, show error
        console.error('❌ No trip coordinates provided from RideBookingForm');
        setCurrentLocationName('Location data missing');
      }
    };

    processTripData();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Panel - Location Display */}
      <div className="w-full lg:w-2/5 bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <Link href="/" className="mr-3">
              <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Your Trip</h1>
          </div>
          
          {/* Trip Details Display */}
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900">Pickup Location</p>
                  <p className="text-sm text-green-800 truncate">{tripDetails?.pickupName || currentLocationName}</p>
                  {currentLocation && (
                    <p className="text-xs text-green-600 mt-1">
                      📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stop Locations */}
            {tripDetails?.stopCoordinates && tripDetails.stopCoordinates.map((stop, index) => (
              <div key={index} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-yellow-900">Stop {index + 1}</p>
                    <p className="text-sm text-yellow-800 truncate">{stop.name}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      📍 {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Drop Location */}
            {tripDetails?.drop && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900">Drop Location</p>
                    <p className="text-sm text-red-800 truncate">{tripDetails.dropName}</p>
                    <p className="text-xs text-red-600 mt-1">
                      📍 {tripDetails.drop.lat.toFixed(4)}, {tripDetails.drop.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trip Summary */}
            {tripDetails && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Trip Summary</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span className="font-semibold">
                      {tripDetails.totalDistance !== 'Unknown' ? `${tripDetails.totalDistance} km` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold">
                      {tripDetails.totalDuration !== 'Unknown' ? `${tripDetails.totalDuration} mins` : 'Calculating...'}
                    </span>
                  </div>
                  {tripDetails.stops && tripDetails.stops.length > 0 && (
                    <div className="flex justify-between">
                      <span>Stops:</span>
                      <span className="font-semibold">{tripDetails.stops.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Message */}
            {currentLocation && tripDetails ? (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-green-900 mb-2">🚗 Ready to Book!</h2>
                  <p className="text-sm text-green-700">
                    Your trip details are confirmed. Choose a ride option to continue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Missing Trip Data</h2>
                  <p className="text-sm text-yellow-700 mb-4">
                    Trip information is incomplete. Please go back and select your locations again.
                  </p>
                  <Link 
                    href="/"
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors inline-block"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ride Options Section (placeholder for future implementation) */}
        {currentLocation && tripDetails && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Rides</h2>
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">🚧 Ride selection coming soon!</p>
              <p className="text-sm">Your trip is ready to be booked.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 h-64 lg:h-screen">
        <LeafletMap
          pickup={currentLocation}
          drop={tripDetails?.drop || null}
          stops={tripDetails?.stopCoordinates || []}
          route={null}
          isInteractive={true}
        />
      </div>
    </div>
  );
}

export default function SelectCarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading trip details...</p></div>}>
      <SelectCarContent />
    </Suspense>
  );
}
