// Map.js - FIXED VERSION WITH PROPER INITIALIZATION
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';

// Google Maps component with multiple route support
export default function GoogleMap({ 
  pickup, 
  drop, 
  stops = [], 
  route, 
  routes = [], 
  selectedRoute = 0, 
  isInteractive = true, 
  userType = "rider", 
  showMultipleRoutes = false,
  driverLocation = null,
  showDriverPin = false
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeRenderers = useRef([]);
  const directionsService = useRef(null);
  const initializationInProgress = useRef(false);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [initError, setInitError] = useState(null);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // ✅ FIXED: Enhanced Google Maps loading with timeout and error handling
  const loadGoogleMapsAPI = useCallback(() => {
    if (typeof window === 'undefined') return Promise.reject('Window undefined');
    
    // Check if already loaded
    if (window.google && window.google.maps) {
      console.log('✅ Google Maps already loaded');
      return Promise.resolve();
    }

    // Check if already loading
    if (window.googleMapsLoading) {
      console.log('⏳ Google Maps loading in progress, waiting...');
      return window.googleMapsLoading;
    }

    console.log('🚀 Loading Google Maps API...');
    
    // Create loading promise
    window.googleMapsLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      
      // Success callback
      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully');
        delete window.googleMapsLoading;
        resolve();
      };
      
      // Error callback
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps API');
        delete window.googleMapsLoading;
        reject(new Error('Failed to load Google Maps API'));
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          console.error('❌ Google Maps API loading timeout');
          reject(new Error('Google Maps API loading timeout'));
        }
      }, 10000);
      
      document.head.appendChild(script);
    });

    return window.googleMapsLoading;
  }, [googleKey]);

  // ✅ FIXED: Load Google Maps API with proper error handling
  useEffect(() => {
    if (!googleKey) {
      setInitError('Google Maps API key not found');
      return;
    }

    let isMounted = true;

    loadGoogleMapsAPI()
      .then(() => {
        if (isMounted) {
          setIsLoaded(true);
          setInitError(null);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('❌ Google Maps initialization failed:', error);
          setInitError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [googleKey, loadGoogleMapsAPI]);

  // ✅ FIXED: Initialize map with proper cleanup and error handling
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current || initializationInProgress.current) {
      return;
    }

    console.log('🗺️ Initializing Google Map...');
    initializationInProgress.current = true;

    try {
      // Default center (India)
      let initialCenter = { lat: 20.5937, lng: 78.9629 };
      let initialZoom = 5;

      // Use pickup location if available
      if (pickup && pickup.lat && pickup.lng) {
        initialCenter = { lat: pickup.lat, lng: pickup.lng };
        initialZoom = 14;
      } else if (driverLocation && driverLocation.lat && driverLocation.lng) {
        initialCenter = { lat: driverLocation.lat, lng: driverLocation.lng };
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
        gestureHandling: isInteractive ? 'auto' : 'cooperative',
        draggable: isInteractive,
        scrollwheel: isInteractive,
        disableDoubleClickZoom: !isInteractive,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi.business',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Initialize directions service
      directionsService.current = new window.google.maps.DirectionsService();

      // Wait for map to be idle before marking as ready
      const idleListener = mapInstance.current.addListener('idle', () => {
        google.maps.event.removeListener(idleListener);
        setIsMapReady(true);
        initializationInProgress.current = false;
        console.log('✅ Google Map initialized and ready');
      });

      // Timeout fallback
      setTimeout(() => {
        if (!isMapReady) {
          setIsMapReady(true);
          initializationInProgress.current = false;
          console.log('✅ Google Map initialized (timeout fallback)');
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Map initialization error:', error);
      setInitError('Failed to initialize map');
      initializationInProgress.current = false;
    }
  }, [isLoaded, isInteractive, pickup, driverLocation, isMapReady]);

  // ✅ FIXED: Clear existing markers with error handling
  const clearMarkers = useCallback(() => {
    try {
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];
    } catch (error) {
      console.error('❌ Error clearing markers:', error);
    }
  }, []);

  // ✅ FIXED: Clear all route renderers with error handling
  const clearRoutes = useCallback(() => {
    try {
      routeRenderers.current.forEach(renderer => {
        if (renderer && renderer.setMap) {
          renderer.setMap(null);
        }
      });
      routeRenderers.current = [];
    } catch (error) {
      console.error('❌ Error clearing routes:', error);
    }
  }, []);

  // ✅ FIXED: Create custom marker icons with error handling
  const createMarkerIcon = useCallback((type) => {
    try {
      const icons = {
        'driver-location': {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#8b5cf6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10,
        },
        'pickup': {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 12,
        },
        'stop': {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10,
        },
        'drop': {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 12,
        }
      };
      return icons[type] || icons['pickup'];
    } catch (error) {
      console.error('❌ Error creating marker icon:', error);
      return null;
    }
  }, []);

  // ✅ FIXED: Add markers to map with validation
  const addMarkers = useCallback(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    console.log('📍 Adding markers to map...');
    clearMarkers();

    try {
      // Add pickup marker
      if (pickup && pickup.lat && pickup.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: pickup.lat, lng: pickup.lng },
          map: mapInstance.current,
          icon: createMarkerIcon('pickup'),
          title: 'Pickup Location'
        });
        markersRef.current.push(marker);
      }

      // Add stop markers
      if (stops && stops.length > 0) {
        stops.forEach((stop, index) => {
          if (stop && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
            const marker = new window.google.maps.Marker({
              position: { lat: stop.lat, lng: stop.lng },
              map: mapInstance.current,
              icon: createMarkerIcon('stop'),
              title: `Stop ${index + 1}`
            });
            markersRef.current.push(marker);
          }
        });
      }

      // Add drop marker
      if (drop && drop.lat && drop.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: drop.lat, lng: drop.lng },
          map: mapInstance.current,
          icon: createMarkerIcon('drop'),
          title: 'Drop Location'
        });
        markersRef.current.push(marker);
      }

      // Add driver location marker
      if (showDriverPin && driverLocation && driverLocation.lat && driverLocation.lng) {
        const marker = new window.google.maps.Marker({
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          map: mapInstance.current,
          icon: createMarkerIcon('driver-location'),
          title: 'Driver Location'
        });
        markersRef.current.push(marker);
      }

      console.log(`✅ Added ${markersRef.current.length} markers to map`);
    } catch (error) {
      console.error('❌ Error adding markers:', error);
    }
  }, [pickup, drop, stops, driverLocation, showDriverPin, isMapReady, clearMarkers, createMarkerIcon]);

  // ✅ FIXED: Generate routes with proper error handling and cleanup
  const generateRoutes = useCallback(async () => {
    if (!pickup || !drop || !directionsService.current || !isMapReady) {
      return;
    }

    console.log('🛣️ Generating routes...');
    setRouteLoading(true);
    clearRoutes();

    try {
      if (showMultipleRoutes && routes.length > 0) {
        // Generate multiple routes
        console.log(`🗺️ Generating ${routes.length} route options`);
        
        const routePromises = routes.map(async (routeOption, index) => {
          return new Promise((resolve) => {
            const waypoints = stops.map(stop => ({
              location: { lat: stop.lat, lng: stop.lng },
              stopover: true
            }));

            const request = {
              origin: { lat: pickup.lat, lng: pickup.lng },
              destination: { lat: drop.lat, lng: drop.lng },
              waypoints: waypoints,
              travelMode: window.google.maps.TravelMode.DRIVING,
              avoidHighways: routeOption.routeData?.avoidHighways || false,
              avoidTolls: routeOption.routeData?.avoidTolls || false,
              optimizeWaypoints: routeOption.routeData?.optimizeWaypoints || false,
              region: 'IN'
            };

            directionsService.current.route(request, (result, status) => {
              if (status === 'OK' && result) {
                const isSelected = index === selectedRoute;
                
                const renderer = new window.google.maps.DirectionsRenderer({
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: isSelected ? '#3b82f6' : '#9ca3af',
                    strokeWeight: isSelected ? 6 : 4,
                    strokeOpacity: isSelected ? 0.9 : 0.6,
                    zIndex: isSelected ? 100 : 10
                  }
                });
                
                renderer.setDirections(result);
                renderer.setMap(mapInstance.current);
                routeRenderers.current.push(renderer);
                
                resolve({ success: true, route: result.routes[0], index });
              } else {
                console.warn(`⚠️ Route ${index + 1} failed:`, status);
                resolve({ success: false, index });
              }
            });
          });
        });

        const results = await Promise.all(routePromises);
        const successful = results.filter(r => r.success);
        
        if (successful.length > 0) {
          const selectedResult = successful.find(r => r.index === selectedRoute);
          if (selectedResult) {
            const route = selectedResult.route;
            setRouteInfo({
              distance: route.legs[0].distance.value,
              duration: route.legs[0].duration.value
            });
          }
          
          // Fit bounds to show all routes
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend({ lat: pickup.lat, lng: pickup.lng });
          bounds.extend({ lat: drop.lat, lng: drop.lng });
          stops.forEach(stop => {
            if (stop.lat && stop.lng) {
              bounds.extend({ lat: stop.lat, lng: stop.lng });
            }
          });
          mapInstance.current.fitBounds(bounds, { padding: 80 });
        }
      } else {
        // Generate single route
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
          region: 'IN'
        };

        directionsService.current.route(request, (result, status) => {
          if (status === 'OK' && result) {
            const renderer = new window.google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#3b82f6',
                strokeWeight: 5,
                strokeOpacity: 0.8
              }
            });
            
            renderer.setDirections(result);
            renderer.setMap(mapInstance.current);
            routeRenderers.current.push(renderer);
            
            const route = result.routes[0];
            setRouteInfo({
              distance: route.legs[0].distance.value,
              duration: route.legs[0].duration.value
            });
          } else {
            console.warn('⚠️ Single route generation failed:', status);
          }
        });
      }
    } catch (error) {
      console.error('❌ Route generation error:', error);
    } finally {
      setRouteLoading(false);
    }
  }, [pickup, drop, stops, showMultipleRoutes, routes, selectedRoute, isMapReady, clearRoutes]);

  // ✅ FIXED: Update markers when dependencies change
  useEffect(() => {
    if (!isMapReady) return;
    
    const timeoutId = setTimeout(() => {
      addMarkers();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isMapReady, addMarkers]);

  // ✅ FIXED: Generate routes when dependencies change
  useEffect(() => {
    if (!isMapReady || !pickup || !drop) return;
    
    const timeoutId = setTimeout(() => {
      generateRoutes();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [isMapReady, generateRoutes]);

  // ✅ FIXED: Update route highlighting when selection changes
  useEffect(() => {
    if (!showMultipleRoutes || routeRenderers.current.length === 0) return;

    routeRenderers.current.forEach((renderer, index) => {
      if (renderer && renderer.setOptions) {
        const isSelected = index === selectedRoute;
        renderer.setOptions({
          polylineOptions: {
            strokeColor: isSelected ? '#3b82f6' : '#9ca3af',
            strokeWeight: isSelected ? 6 : 4,
            strokeOpacity: isSelected ? 0.9 : 0.6,
            zIndex: isSelected ? 100 : 10
          }
        });
      }
    });
  }, [selectedRoute, showMultipleRoutes]);

  // ✅ FIXED: Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
      clearRoutes();
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, [clearMarkers, clearRoutes]);

  // Show error state
  if (initError) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#ef4444', marginBottom: '10px' }}>❌ Map Error</p>
          <p style={{ color: '#666', fontSize: '14px' }}>{initError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading indicator */}
      {(!isLoaded || !isMapReady) && (
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
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {!isLoaded ? 'Loading Google Maps...' : 'Initializing map...'}
          </p>
        </div>
      )}

      {/* Route loading indicator */}
      {routeLoading && isMapReady && (
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
          🛣️ Calculating routes...
        </div>
      )}

      {/* Route info */}
      {routeInfo && isMapReady && !routeLoading && (
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
          {Math.round(routeInfo.distance / 1000 * 10) / 10} km • {Math.round(routeInfo.duration / 60)} min
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
