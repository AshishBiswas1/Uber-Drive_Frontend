// src/app/select-car/page.js
'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CarOption({ 
  icon, 
  title, 
  description, 
  price, 
  estimatedTime, 
  isSelected, 
  onSelect,
  isPopular = false 
}) {
  return (
    <div 
      className={`border rounded-lg p-6 cursor-pointer transition-all relative ${
        isSelected 
          ? 'border-primary bg-primary/10' 
          : isPopular 
            ? 'border-primary/50 bg-primary/5' 
            : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      {isPopular && (
        <div className="absolute -top-3 left-4">
          <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{icon}</span>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-[color:var(--muted)] text-sm">{description}</p>
            <p className="text-xs text-[color:var(--muted)] mt-1">
              {estimatedTime} • {price}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{price}</p>
          <p className="text-xs text-[color:var(--muted)]">{estimatedTime}</p>
        </div>
      </div>
    </div>
  );
}

// Map component placeholder
function RouteMapComponent({ pickup, drop, stops, distance, duration }) {
  return (
    <div className="h-full w-full bg-gray-800 rounded-lg flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Route Preview</h3>
        <p className="text-sm text-gray-400">Your trip route with {stops?.length || 0} stop(s)</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-gray-400 mb-4">Interactive map with route</p>
          
          <div className="space-y-2 text-sm text-gray-300 text-left max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="truncate">From: {pickup}</span>
            </div>
            
            {stops && stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="truncate">Stop {index + 1}: {stop}</span>
              </div>
            ))}
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="truncate">To: {drop}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-400">Total Distance</p>
            <p className="text-white font-semibold">{distance} km</p>
          </div>
          <div>
            <p className="text-gray-400">Est. Duration</p>
            <p className="text-white font-semibold">{duration} mins</p>
          </div>
        </div>
        {stops && stops.length > 0 && (
          <div className="text-center mt-2">
            <p className="text-gray-400 text-xs">Including {stops.length} stop(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate component that uses useSearchParams
function SelectCarContent() {
  const searchParams = useSearchParams();
  const [selectedCar, setSelectedCar] = useState('flex');
  const [tripDetails, setTripDetails] = useState({
    pickup: '',
    drop: '',
    stops: [],
    distance: '',
    duration: ''
  });

  useEffect(() => {
    const stopsParam = searchParams.get('stops');
    let parsedStops = [];
    
    try {
      parsedStops = stopsParam ? JSON.parse(stopsParam) : [];
    } catch (error) {
      console.error('Error parsing stops:', error);
      parsedStops = [];
    }

    setTripDetails({
      pickup: searchParams.get('pickup') || 'Current Location',
      drop: searchParams.get('drop') || 'Destination',
      stops: parsedStops,
      distance: searchParams.get('totalDistance') || '0',
      duration: searchParams.get('totalDuration') || '0'
    });
  }, [searchParams]);

  const carOptions = [
    {
      id: 'saver',
      icon: '🚗',
      title: 'Saver',
      description: 'Affordable rides in compact cars',
      price: '₹89',
      estimatedTime: '3 min away'
    },
    {
      id: 'flex',
      icon: '🚙',
      title: 'Flex',
      description: 'Spacious sedans with priority pickup',
      price: '₹129',
      estimatedTime: '2 min away',
      isPopular: true
    },
    {
      id: 'pro',
      icon: '🚘',
      title: 'Pro',
      description: 'Premium cars with top-rated drivers',
      price: '₹189',
      estimatedTime: '4 min away'
    }
  ];

  const handleBookRide = () => {
    const selectedCarData = carOptions.find(car => car.id === selectedCar);
    
    const bookingData = {
      car: selectedCarData,
      pickup: tripDetails.pickup,
      drop: tripDetails.drop,
      stops: tripDetails.stops,
      distance: tripDetails.distance,
      duration: tripDetails.duration
    };
    
    console.log('Booking ride:', bookingData);
    alert(`Booking ${selectedCarData.title} for ${selectedCarData.price} - Distance: ${tripDetails.distance}km`);
  };

  return (
    <>
      {/* Left Half - Car Selection */}
      <div className="w-full lg:w-1/2 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-10">
          {/* Back navigation */}
          <div className="mb-6">
            <Link href="/rider" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-foreground">
              ← Back to rider page
            </Link>
          </div>

          {/* Trip Summary */}
          <div className="card p-6 mb-6">
            <h1 className="text-2xl font-semibold mb-4">Select your ride</h1>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-[color:var(--muted)]">From:</span>
                <span className="font-medium">{tripDetails.pickup || 'Pickup location'}</span>
              </div>
              
              {tripDetails.stops && tripDetails.stops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2 ml-6">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-[color:var(--muted)]">Stop {index + 1}:</span>
                  <span className="font-medium">{stop}</span>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-[color:var(--muted)]">To:</span>
                <span className="font-medium">{tripDetails.drop || 'Drop location'}</span>
              </div>
              
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                <span className="text-[color:var(--muted)]">Distance: {tripDetails.distance} km</span>
                <span className="text-[color:var(--muted)]">Duration: {tripDetails.duration} mins</span>
              </div>
              
              {tripDetails.stops && tripDetails.stops.length > 0 && (
                <div className="bg-blue-500/10 rounded-lg p-3 mt-3">
                  <p className="text-blue-400 text-sm">
                    📍 {tripDetails.stops.length} stop(s) included in this trip
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Car Options */}
          <div className="space-y-4 mb-6">
            {carOptions.map((car) => (
              <CarOption
                key={car.id}
                icon={car.icon}
                title={car.title}
                description={car.description}
                price={car.price}
                estimatedTime={car.estimatedTime}
                isSelected={selectedCar === car.id}
                isPopular={car.isPopular}
                onSelect={() => setSelectedCar(car.id)}
              />
            ))}
          </div>

          {/* Payment Method Preview */}
          <div className="card p-6 mb-6">
            <h3 className="font-semibold mb-3">Payment Method</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">💳</span>
              </div>
              <span className="text-sm">**** **** **** 1234</span>
              <Link href="#" className="text-primary text-sm ml-auto">Change</Link>
            </div>
          </div>

          {/* Book Button */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur py-4">
            <button
              onClick={handleBookRide}
              className="btn btn-primary w-full py-4 text-lg"
            >
              Book {carOptions.find(car => car.id === selectedCar)?.title} - {carOptions.find(car => car.id === selectedCar)?.price}
            </button>
            <p className="text-center text-xs text-[color:var(--muted)] mt-2">
              Total trip distance: {tripDetails.distance} km • You&apos;ll be charged after completion
            </p>
          </div>
        </div>
      </div>

      {/* Right Half - Map */}
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
        <div className="h-full p-4">
          <RouteMapComponent 
            pickup={tripDetails.pickup} 
            drop={tripDetails.drop}
            stops={tripDetails.stops}
            distance={tripDetails.distance}
            duration={tripDetails.duration}
          />
        </div>
      </div>
    </>
  );
}

// Loading component for Suspense fallback
function SelectCarLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="card p-6">
              <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-300 rounded"></div>
              <div className="h-20 bg-gray-300 rounded"></div>
              <div className="h-20 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0">
        <div className="h-full p-4">
          <div className="h-full bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-gray-400">Loading map...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SelectCarPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <Suspense fallback={<SelectCarLoading />}>
        <SelectCarContent />
      </Suspense>
    </main>
  );
}
