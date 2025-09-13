'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gpsService } from '../utils/gpsService';

// Fix for default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create custom Google Maps-style circular icons
const createDriverIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background-color: #4285f4;
          border-radius: 50%;
          opacity: 0.2;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background-color: #4285f4;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    className: 'custom-marker-driver',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createRiderIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background-color: #34a853;
          border-radius: 50%;
          opacity: 0.2;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background-color: #34a853;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    className: 'custom-marker-rider',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background-color: #ff6b35;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    className: 'custom-marker-pickup',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createStopIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 22px;
        height: 22px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 22px;
          height: 22px;
          background-color: #fbbf24;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-marker-stop',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const createDropIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background-color: #d32f2f;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    className: 'custom-marker-drop',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapController({ center, zoom, bounds, isInteractive }) {
  const map = useMap();

  useEffect(() => {
    // View Logic
    if (bounds && isInteractive) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.flyTo(center, zoom);
    }

    // Interaction Logic
    if (isInteractive === false) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.tap) map.tap.disable();
      
      if (map.zoomControl) {
        map.zoomControl.remove();
      }
    }
    
  }, [center, zoom, bounds, isInteractive, map]);

  return null;
}

export default function LeafletMap({ pickup, drop, stops = [], route, isInteractive, userType = "driver" }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Enhanced route generation with multiple stops support
  const generateRouteWithStops = async (startCoords, endCoords, stopCoords = []) => {
    if (!startCoords || !endCoords) return null;

    setRouteLoading(true);
    try {
      console.log(`🗺️ Generating route from ${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)} to ${endCoords.lat.toFixed(4)}, ${endCoords.lng.toFixed(4)}`);
      if (stopCoords.length > 0) {
        console.log(`   with ${stopCoords.length} stops:`, stopCoords.map(s => `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`));
      }

      // Build waypoints for OSRM: start -> stops -> end
      const waypoints = [
        `${startCoords.lng},${startCoords.lat}`, // Start point
        ...stopCoords.map(stop => `${stop.lng},${stop.lat}`), // Intermediate stops
        `${endCoords.lng},${endCoords.lat}` // End point
      ];

      const waypointsStr = waypoints.join(';');
      
      // Try OSRM with multiple waypoints
      try {
        console.log('🛣️ Trying OSRM routing service with waypoints...');
        const osrmResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson&steps=true&annotations=true`
        );
        
        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();
          if (osrmData.routes && osrmData.routes.length > 0) {
            console.log('✅ OSRM multi-stop route generated successfully');
            console.log(`📏 Route: ${Math.round(osrmData.routes[0].distance)}m, ${Math.round(osrmData.routes[0].duration)}s`);
            return {
              geometry: osrmData.routes[0].geometry,
              distance: osrmData.routes[0].distance,
              duration: osrmData.routes[0].duration,
              service: 'OSRM',
              waypoints: osrmData.waypoints
            };
          }
        }
        throw new Error('OSRM failed');
      } catch (osrmError) {
        console.warn('⚠️ OSRM failed:', osrmError.message);
      }

      // Fallback: Create route segments manually
      console.log('⚠️ Creating manual route segments...');
      const allPoints = [startCoords, ...stopCoords, endCoords];
      const routeSegments = [];
      let totalDistance = 0;
      let totalDuration = 0;

      // Generate route for each segment
      for (let i = 0; i < allPoints.length - 1; i++) {
        const segmentStart = allPoints[i];
        const segmentEnd = allPoints[i + 1];
        
        try {
          // Try to get a route segment via OSRM
          const segmentResponse = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${segmentStart.lng},${segmentStart.lat};${segmentEnd.lng},${segmentEnd.lat}?overview=full&geometries=geojson`
          );
          
          if (segmentResponse.ok) {
            const segmentData = await segmentResponse.json();
            if (segmentData.routes && segmentData.routes.length > 0) {
              routeSegments.push(segmentData.routes[0]);
              totalDistance += segmentData.routes[0].distance;
              totalDuration += segmentData.routes[0].duration;
            }
          }
        } catch (segmentError) {
          // Fallback to straight line for this segment
          const distance = gpsService.calculateDistance(segmentStart.lat, segmentStart.lng, segmentEnd.lat, segmentEnd.lng);
          routeSegments.push({
            geometry: {
              coordinates: [
                [segmentStart.lng, segmentStart.lat],
                [segmentEnd.lng, segmentEnd.lat]
              ]
            },
            distance: distance,
            duration: Math.round(distance / 30 * 3600) // 30 km/h average
          });
          totalDistance += distance;
          totalDuration += Math.round(distance / 30 * 3600);
        }
      }

      // Combine all route segments
      const combinedCoordinates = [];
      routeSegments.forEach(segment => {
        if (segment.geometry && segment.geometry.coordinates) {
          combinedCoordinates.push(...segment.geometry.coordinates);
        }
      });

      console.log('✅ Manual multi-stop route created');
      return {
        geometry: {
          coordinates: combinedCoordinates
        },
        distance: totalDistance,
        duration: totalDuration,
        service: 'manual-segments'
      };

    } catch (error) {
      console.error('❌ All routing methods failed:', error);
      
      // Ultimate fallback - straight line through all points
      const allPoints = [startCoords, ...stopCoords, endCoords];
      const coordinates = allPoints.map(point => [point.lng, point.lat]);
      
      let totalDistance = 0;
      for (let i = 0; i < allPoints.length - 1; i++) {
        totalDistance += gpsService.calculateDistance(
          allPoints[i].lat, allPoints[i].lng,
          allPoints[i + 1].lat, allPoints[i + 1].lng
        );
      }

      return {
        geometry: { coordinates },
        distance: totalDistance,
        duration: Math.round(totalDistance / 30 * 3600), // 30 km/h
        service: 'straight-line'
      };
    } finally {
      setRouteLoading(false);
    }
  };

  // Generate route when pickup, drop, and stops are available
  useEffect(() => {
    if (pickup && drop && !route && isInteractive) {
      console.log('🚗 Generating multi-stop route...');
      generateRouteWithStops(pickup, drop, stops).then(newRoute => {
        if (newRoute) {
          setGeneratedRoute(newRoute);
        }
      });
    }
  }, [pickup, drop, stops, route, isInteractive]);

  // GPS logic for fallback cases
  useEffect(() => {
    if (isInteractive && !pickup && !currentLocation) {
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
    }
  }, [isInteractive, pickup, currentLocation]);

  let mapCenter = null;
  let mapZoom = 14;
  let mapBounds = null;

  if (isInteractive) {
    mapCenter = pickup ? [pickup.lat, pickup.lng] : (currentLocation || null);
    mapZoom = 16;
    
    if (pickup && drop) {
      // Include all points in bounds: pickup, stops, drop
      const allPoints = [pickup, ...stops, drop].filter(Boolean);
      if (allPoints.length > 1) {
        mapBounds = L.latLngBounds(allPoints.map(point => [point.lat, point.lng]));
        
        // Extend bounds to include route if available
        const routeToUse = route || generatedRoute;
        if (routeToUse?.geometry?.coordinates) {
          routeToUse.geometry.coordinates.forEach(coord => mapBounds.extend([coord[1], coord[0]]));
        }
      }
    }
  } else {
    if (pickup) {
      mapCenter = [pickup.lat, pickup.lng];
      mapZoom = 16;
    }
  }

  // Use provided route or generated route
  const routeToDisplay = route || generatedRoute;
  const routePositions = routeToDisplay?.geometry?.coordinates?.map(coord => [coord[1], coord[0]]) || [];
  const cartoDbAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution">CARTO</a>';

  // Determine which icons to use based on context
  const getMarkerIcon = (markerType) => {
    switch (markerType) {
      case 'driver-location':
        return createDriverIcon();
      case 'rider-location':
        return createRiderIcon();
      case 'pickup':
        return createPickupIcon();
      case 'stop':
        return createStopIcon();
      case 'drop':
        return createDropIcon();
      default:
        return createDriverIcon();
    }
  };

  return (
    <MapContainer 
      center={mapCenter || [20.5937, 78.9629]} 
      zoom={mapCenter ? mapZoom : 5} 
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution={cartoDbAttribution}
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
      />
      
      {/* Route loading indicator */}
      {routeLoading && isInteractive && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '12px',
          color: '#666',
          fontWeight: '500'
        }}>
          🛣️ Finding route through stops...
        </div>
      )}
      
      {/* Route info indicator */}
      {routeToDisplay && isInteractive && !routeLoading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '500'
        }}>
          {routeToDisplay.distance ? 
            `${Math.round(routeToDisplay.distance/1000 * 10)/10}km` : 
            'Route'
          }
          {routeToDisplay.duration && 
            ` • ${Math.round(routeToDisplay.duration/60)}min`
          }
          {stops.length > 0 && (
            <div style={{ fontSize: '9px', opacity: 0.8 }}>
              via {stops.length} stop{stops.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      
      {/* Show driver location (when map is non-interactive) */}
      {!isInteractive && pickup && (
        <Marker 
          position={[pickup.lat, pickup.lng]} 
          icon={getMarkerIcon('driver-location')}
        />
      )}
      
      {/* Show pickup location for trips */}
      {isInteractive && pickup && (
        <Marker 
          position={[pickup.lat, pickup.lng]} 
          icon={getMarkerIcon('pickup')}
        />
      )}

      {/* Show stop locations */}
      {stops && stops.map((stop, index) => (
        <Marker 
          key={index}
          position={[stop.lat, stop.lng]} 
          icon={getMarkerIcon('stop')}
        />
      ))}

      {/* Show rider current location (fallback case) */}
      {isInteractive && !pickup && currentLocation && (
        <Marker 
          position={currentLocation} 
          icon={getMarkerIcon('rider-location')}
        />
      )}

      {/* Show drop location for trips */}
      {drop && (
        <Marker 
          position={[drop.lat, drop.lng]} 
          icon={getMarkerIcon('drop')}
        />
      )}

      {/* Show route line */}
      {routePositions.length > 0 && (
        <Polyline 
          positions={routePositions} 
          color="#3b82f6" 
          weight={4} 
          opacity={0.8}
          className="route-line"
          dashArray={routeToDisplay?.service === 'straight-line' ? '10, 10' : null}
        />
      )}

      <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} isInteractive={isInteractive} />
    </MapContainer>
  );
}
