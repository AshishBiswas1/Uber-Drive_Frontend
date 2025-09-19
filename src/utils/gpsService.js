// src/utils/gpsService.js - FIXED WITH TIMEOUT HANDLING
'use client';

class GPSService {
  constructor() {
    this.geocodeCache = new Map();
    this.isWatching = false;
    this.watchId = null;
    this.lastKnownPosition = null;
    this.onLocationUpdate = null;
    this.googleMapsReady = false;
    this.directionsService = null;
    this.placesService = null;
    this.initializationPromise = null;
  }

  clearCache() {
    this.geocodeCache.clear();
  }

  getAccuracyStatus(accuracy) {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Very Good';
    if (accuracy <= 20) return 'Good';
    if (accuracy <= 50) return 'Fair';
    if (accuracy <= 100) return 'City-level';
    return 'Area-level';
  }

  // Fixed: Initialize Google Maps with proper timeout and fallback
  async initGoogleMaps() {
    // If already initialized, return immediately
    if (this.googleMapsReady && window.google && window.google.maps) {
      return true;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this._performGoogleMapsInit();
    return await this.initializationPromise;
  }

  async _performGoogleMapsInit() {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Check if already loaded
      if (window.google && window.google.maps) {
        this.googleMapsReady = true;
        this._initializeServices();
        return true;
      }

      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!googleKey) {
        return false;
      }

      // Create promise with timeout
      const loadPromise = new Promise((resolve, reject) => {
        // Set timeout first
        const timeout = setTimeout(() => {
          resolve(false); // Don't reject, just resolve with false
        }, 10000);

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          clearTimeout(timeout);
          
          // Check periodically if Google Maps is ready
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve(true);
            }
          }, 100);

          // Fallback timeout for existing script
          setTimeout(() => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(false);
          }, 5000);
          
          return;
        }

        // Create new script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=geometry,places&callback=initGoogleMapsCallback`;
        script.async = true;
        script.defer = true;

        // Global callback function
        window.initGoogleMapsCallback = () => {
          clearTimeout(timeout);
          resolve(true);
        };

        script.onload = () => {
          clearTimeout(timeout);
          // Give it a moment to initialize
          setTimeout(() => {
            if (window.google && window.google.maps) {
              resolve(true);
            } else {
              resolve(false);
            }
          }, 500);
        };

        script.onerror = () => {
          clearTimeout(timeout);
          resolve(false); // Don't reject, continue without Google Maps
        };

        document.head.appendChild(script);
      });

      const success = await loadPromise;
      
      if (success && window.google && window.google.maps) {
        this.googleMapsReady = true;
        this._initializeServices();
        return true;
      } else {
        return false;
      }

    } catch (error) {
      return false;
    } finally {
      // Clean up
      if (typeof window !== 'undefined' && window.initGoogleMapsCallback) {
        delete window.initGoogleMapsCallback;
      }
      this.initializationPromise = null;
    }
  }

  _initializeServices() {
    try {
      if (window.google && window.google.maps) {
        this.directionsService = new window.google.maps.DirectionsService();
        this.placesService = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
    } catch (error) {
      // Error initializing Google Maps services handled silently
    }
  }

  // Fixed: Enhanced start watching with proper error handling
  startWatching(callback, options = {}) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (callback) {
        try {
          callback(null, new Error('Geolocation not supported'));
        } catch (callbackError) {
          // Error in callback handled silently
        }
      }
      return false;
    }

    if (this.isWatching) {
      return true;
    }
    
    this.onLocationUpdate = callback;
    
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!position || !position.coords) {
          if (this.onLocationUpdate) {
            try {
              this.onLocationUpdate(null, new Error('Invalid position data'));
            } catch (callbackError) {
              // Error in GPS callback handled silently
            }
          }
          return;
        }

        const { coords } = position;
        
        if (typeof coords.latitude !== 'number' || 
            typeof coords.longitude !== 'number' ||
            isNaN(coords.latitude) || 
            isNaN(coords.longitude)) {
          if (this.onLocationUpdate) {
            try {
              this.onLocationUpdate(null, new Error('Invalid coordinates'));
            } catch (callbackError) {
              // Error in GPS callback handled silently
            }
          }
          return;
        }

        const location = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy || null,
          timestamp: position.timestamp || Date.now()
        };
        
        this.lastKnownPosition = location;
        
        if (this.onLocationUpdate) {
          try {
            this.onLocationUpdate(location, null);
          } catch (callbackError) {
            // Error in GPS callback handled silently
          }
        }
      },
      (error) => {
        if (this.onLocationUpdate) {
          try {
            this.onLocationUpdate(null, error);
          } catch (callbackError) {
            // Error in GPS error callback handled silently
          }
        }
      },
      defaultOptions
    );

    this.isWatching = true;
    return true;
  }

  stopWatching() {
    if (this.watchId && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
      this.onLocationUpdate = null;
    }
  }

  async getCurrentPosition(options = {}) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!position || !position.coords) {
            reject(new Error('Invalid position data'));
            return;
          }

          const { coords } = position;
          
          if (typeof coords.latitude !== 'number' || 
              typeof coords.longitude !== 'number' ||
              isNaN(coords.latitude) || 
              isNaN(coords.longitude)) {
            reject(new Error('Invalid coordinates'));
            return;
          }

          const location = {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy || null,
            timestamp: position.timestamp || Date.now()
          };
          
          this.lastKnownPosition = location;
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        defaultOptions
      );
    });
  }

  async searchAddress(query, biasLocation = null) {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }

    const cacheKey = `${query}_${biasLocation ? `${biasLocation[0]}_${biasLocation[1]}` : 'none'}`;
    
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      let results = [];

      // Try Google Maps first if available
      if (this.googleMapsReady && window.google && window.google.maps) {
        try {
          results = await this.googleGeocode(query, biasLocation);
          if (results.length > 0) {
            this.geocodeCache.set(cacheKey, results);
            return results;
          }
        } catch (error) {
          // Google Geocoding failed, try fallback
        }
      }

      // Fallback to Nominatim
      results = await this.nominatimGeocode(query, biasLocation);
      if (results.length > 0) {
        this.geocodeCache.set(cacheKey, results);
        return results;
      }

      throw new Error('No results found');

    } catch (error) {
      throw error;
    }
  }

  async googleGeocode(query, biasLocation = null) {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        reject(new Error('Google Maps not available'));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const request = { address: query };

      if (biasLocation && Array.isArray(biasLocation) && biasLocation.length === 2) {
        request.location = new window.google.maps.LatLng(biasLocation[0], biasLocation[1]);
        request.radius = 50000;
      }

      geocoder.geocode(request, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const formattedResults = results.slice(0, 5).map(result => ({
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            address: result.formatted_address,
            source: 'google'
          }));
          
          resolve(formattedResults);
        } else {
          reject(new Error(`Google Geocoding failed: ${status}`));
        }
      });
    });
  }

  async nominatimGeocode(query, biasLocation = null) {
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
      
      if (biasLocation && Array.isArray(biasLocation) && biasLocation.length === 2) {
        url += `&lat=${biasLocation[0]}&lon=${biasLocation[1]}`;
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RideBookingApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const results = data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        source: 'nominatim'
      }));

      return results;

    } catch (error) {
      throw error;
    }
  }

  getLastKnownPosition() {
    return this.lastKnownPosition;
  }

  isActivelyWatching() {
    return this.isWatching;
  }

  cleanup() {
    this.stopWatching();
    this.geocodeCache.clear();
    this.googleMapsReady = false;
    this.directionsService = null;
    this.placesService = null;
    this.initializationPromise = null;
  }
}

const gpsService = new GPSService();
export { gpsService };
