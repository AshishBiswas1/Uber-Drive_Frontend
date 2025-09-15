'use client';
import { useEffect, useState, useRef } from 'react';
import { gpsService } from '../utils/gpsService';

// Google Maps component
export default function GoogleMap({ pickup, drop, stops = [], route, isInteractive, userType = "driver" }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeRenderer = useRef(null);
  const directionsService = useRef(null);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=geometry,places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('Failed to load Google Maps API');
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleKey]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current) return;

    // Default center (India)
    let initialCenter = { lat: 20.5937, lng: 78.9629 };
    let initialZoom = 5;

    // Use pickup location if available
    if (pickup) {
      initialCenter = { lat: pickup.lat, lng: pickup.lng };
      initialZoom = 16;
    }

    // Initialize map
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: isInteractive,
      gestureHandling: isInteractive ? 'auto' : 'none',
      draggable: isInteractive,
      scrollwheel: isInteractive,
      disableDoubleClickZoom: !isInteractive,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Initialize directions service and renderer
    directionsService.current = new window.google.maps.DirectionsService();
    routeRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // We'll use custom markers
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });
    routeRenderer.current.setMap(mapInstance.current);

  }, [isLoaded, isInteractive]);

  // Clear existing markers
  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  // Create custom marker icons
  const createMarkerIcon = (type) => {
    const icons = {
      'driver-location': {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285f4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
      'rider-location': {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#34a853',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
      'pickup': {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#ff6b35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 12,
      },
      'stop': {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#fbbf24',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 10,
      },
      'drop': {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#d32f2f',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 12,
      }
    };
    return icons[type] || icons['driver-location'];
  };

  // Add markers to map
  const addMarkers = () => {
    if (!mapInstance.current) return;
    
    clearMarkers();

    // Add pickup marker (or driver location for non-interactive maps)
    if (pickup) {
      const markerType = isInteractive ? 'pickup' : 'driver-location';
      const marker = new window.google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map: mapInstance.current,
        icon: createMarkerIcon(markerType),
        title: isInteractive ? 'Pickup Location' : 'Driver Location'
      });
      markersRef.current.push(marker);
    }

    // Add stop markers
    stops.forEach((stop, index) => {
      if (stop && stop.lat && stop.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map: mapInstance.current,
          icon: createMarkerIcon('stop'),
          title: `Stop ${index + 1}`
        });
        markersRef.current.push(marker);
      }
    });

    // Add drop marker
    if (drop) {
      const marker = new window.google.maps.Marker({
        position: { lat: drop.lat, lng: drop.lng },
        map: mapInstance.current,
        icon: createMarkerIcon('drop'),
        title: 'Drop Location'
      });
      markersRef.current.push(marker);
    }

    // Add current location marker (fallback)
    if (isInteractive && !pickup && currentLocation) {
      const marker = new window.google.maps.Marker({
        position: { lat: currentLocation[0], lng: currentLocation[1] },
        map: mapInstance.current,
        icon: createMarkerIcon('rider-location'),
        title: 'Your Location'
      });
      markersRef.current.push(marker);
    }
  };

  // Generate route with Google Directions API
  const generateRoute = async () => {
    if (!pickup || !drop || !directionsService.current || !isInteractive) return;

    setRouteLoading(true);
    console.log('🗺️ Generating route with Google Directions API...');

    try {
      // Prepare waypoints
      const waypoints = stops.map(stop => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true
      }));

      const request = {
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat, lng: drop.lng },
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: waypoints.length > 0,
        avoidHighways: false,
        avoidTolls: false,
        region: 'IN' // Bias for India
      };

      directionsService.current.route(request, (result, status) => {
        if (status === 'OK' && result) {
          console.log('✅ Google Directions route generated successfully');
          
          // Display route
          routeRenderer.current.setDirections(result);
          
          // Extract route info
          const route = result.routes[0];
          const leg = route.legs[0];
          
          setRouteInfo({
            distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
            duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
            service: 'Google Directions'
          });

          // Fit map to route bounds
          const bounds = new window.google.maps.LatLngBounds();
          route.legs.forEach(leg => {
            leg.steps.forEach(step => {
              step.path.forEach(point => {
                bounds.extend(point);
              });
            });
          });
          mapInstance.current.fitBounds(bounds, { padding: 50 });
          
        } else {
          console.error('❌ Google Directions failed:', status);
          // Fallback to straight line
          createStraightLineRoute();
        }
        setRouteLoading(false);
      });

    } catch (error) {
      console.error('❌ Route generation error:', error);
      createStraightLineRoute();
      setRouteLoading(false);
    }
  };

  // Fallback straight line route
  const createStraightLineRoute = () => {
    if (!pickup || !drop) return;

    const path = [
      { lat: pickup.lat, lng: pickup.lng },
      ...stops.map(stop => ({ lat: stop.lat, lng: stop.lng })),
      { lat: drop.lat, lng: drop.lng }
    ];

    // Create polyline
    const polyline = new window.google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      strokePattern: [10, 10] // Dashed line to indicate it's not a real route
    });

    polyline.setMap(mapInstance.current);

    // Calculate approximate distance
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(path[i]),
        new window.google.maps.LatLng(path[i + 1])
      );
      totalDistance += distance;
    }

    setRouteInfo({
      distance: totalDistance,
      duration: Math.round(totalDistance / 30 * 3.6), // 30 km/h estimate
      service: 'Straight Line'
    });
  };

  // Update markers when props change
  useEffect(() => {
    if (!isLoaded) return;
    addMarkers();
  }, [isLoaded, pickup, drop, stops, currentLocation, isInteractive]);

  // Generate route when needed
  useEffect(() => {
    if (!isLoaded || !pickup || !drop || !isInteractive) return;
    
    // Clear existing route
    if (routeRenderer.current) {
      routeRenderer.current.setDirections({ routes: [] });
    }
    
    generateRoute();
  }, [isLoaded, pickup, drop, stops, isInteractive]);

  // Adjust map view when markers change
  useEffect(() => {
    if (!isLoaded || !mapInstance.current) return;

    if (isInteractive && pickup && drop) {
      // Fit bounds to include all points
      const bounds = new window.google.maps.LatLngBounds();
      
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      stops.forEach(stop => {
        if (stop && stop.lat && stop.lng) {
          bounds.extend({ lat: stop.lat, lng: stop.lng });
        }
      });
      bounds.extend({ lat: drop.lat, lng: drop.lng });
      
      mapInstance.current.fitBounds(bounds, { padding: 50 });
    } else if (pickup) {
      // Center on pickup/driver location
      mapInstance.current.setCenter({ lat: pickup.lat, lng: pickup.lng });
      mapInstance.current.setZoom(16);
    }
  }, [isLoaded, pickup, drop, stops, isInteractive]);

  // GPS fallback logic
  useEffect(() => {
    if (!isInteractive || pickup || currentLocation) return;

    const handleGPSUpdate = (position, error) => {
      if (error) {
        setCurrentLocation([20.5937, 78.9629]);
        return;
      }

      const newLocation = [position.coords.latitude, position.coords.longitude];
      setCurrentLocation(newLocation);
      setLocationAccuracy(position.coords.accuracy);
    };

    gpsService.startWatching(handleGPSUpdate);
    return () => {
      gpsService.stopWatching(handleGPSUpdate);
    };
  }, [isInteractive, pickup, currentLocation]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearMarkers();
      if (routeRenderer.current) {
        routeRenderer.current.setMap(null);
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading indicator */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #4285f4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Loading Google Maps...</p>
        </div>
      )}

      {/* Route loading indicator */}
      {routeLoading && isInteractive && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '12px',
          color: '#666',
          fontWeight: '500'
        }}>
          🛣️ Finding optimal route...
        </div>
      )}

      {/* Route info */}
      {routeInfo && isInteractive && !routeLoading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(66, 133, 244, 0.95)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div>
            {Math.round(routeInfo.distance / 1000 * 10) / 10} km • {Math.round(routeInfo.duration / 60)} min
          </div>
          {stops.length > 0 && (
            <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>
              via {stops.length} stop{stops.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Add CSS for spinning animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
