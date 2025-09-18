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
    console.log('🧹 GPS cache cleared');
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

  // ✅ FIXED: Initialize Google Maps with proper timeout and fallback
  async initGoogleMaps() {
    // If already initialized, return immediately
    if (this.googleMapsReady && window.google && window.google.maps) {
      console.log('✅ Google Maps already ready');
      return true;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      console.log('⏳ Google Maps initialization in progress, waiting...');
      return await this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this._performGoogleMapsInit();
    return await this.initializationPromise;
  }

  async _performGoogleMapsInit() {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Window not available, skipping Google Maps init');
      return false;
    }

    try {
      // Check if already loaded
      if (window.google && window.google.maps) {
        this.googleMapsReady = true;
        this._initializeServices();
        console.log('✅ Google Maps already loaded');
        return true;
      }

      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!googleKey) {
        console.error('❌ Google Maps API key not found');
        return false;
      }

      console.log('🚀 Loading Google Maps API...');

      // Create promise with timeout
      const loadPromise = new Promise((resolve, reject) => {
        // Set timeout first
        const timeout = setTimeout(() => {
          console.warn('⚠️ Google Maps loading timeout (10s), continuing anyway...');
          resolve(false); // Don't reject, just resolve with false
        }, 10000);

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          console.log('🔄 Google Maps script already exists, waiting for load...');
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
          console.log('✅ Google Maps API loaded via callback');
          resolve(true);
        };

        script.onload = () => {
          clearTimeout(timeout);
          console.log('✅ Google Maps script loaded');
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
          console.error('❌ Google Maps script failed to load');
          resolve(false); // Don't reject, continue without Google Maps
        };

        document.head.appendChild(script);
      });

      const success = await loadPromise;
      
      if (success && window.google && window.google.maps) {
        this.googleMapsReady = true;
        this._initializeServices();
        console.log('✅ Google Maps initialization successful');
        return true;
      } else {
        console.warn('⚠️ Google Maps initialization failed or timed out - continuing without');
        return false;
      }

    } catch (error) {
      console.error('❌ Google Maps initialization error:', error);
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
        console.log('✅ Google Maps services initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing Google Maps services:', error);
    }
  }

  // ✅ FIXED: Enhanced start watching with proper error handling
  startWatching(callback, options = {}) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      if (callback) {
        try {
          callback(null, new Error('Geolocation not supported'));
        } catch (callbackError) {
          console.error('❌ Error in callback:', callbackError);
        }
      }
      return false;
    }

    if (this.isWatching) {
      console.log('📍 GPS watching already active');
      return true;
    }

    console.log('🚀 Starting GPS watching...');
    
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
          console.warn('⚠️ GPS: Received invalid position object');
          if (this.onLocationUpdate) {
            try {
              this.onLocationUpdate(null, new Error('Invalid position data'));
            } catch (callbackError) {
              console.error('❌ Error in GPS callback:', callbackError);
            }
          }
          return;
        }

        const { coords } = position;
        
        if (typeof coords.latitude !== 'number' || 
            typeof coords.longitude !== 'number' ||
            isNaN(coords.latitude) || 
            isNaN(coords.longitude)) {
          console.warn('⚠️ GPS: Invalid coordinates received:', coords);
          if (this.onLocationUpdate) {
            try {
              this.onLocationUpdate(null, new Error('Invalid coordinates'));
            } catch (callbackError) {
              console.error('❌ Error in GPS callback:', callbackError);
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
        console.log(`📍 GPS Update: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${Math.round(location.accuracy || 0)}m)`);
        
        if (this.onLocationUpdate) {
          try {
            this.onLocationUpdate(location, null);
          } catch (callbackError) {
            console.error('❌ Error in GPS callback:', callbackError);
          }
        }
      },
      (error) => {
        console.error('❌ GPS Error:', error.message);
        
        if (this.onLocationUpdate) {
          try {
            this.onLocationUpdate(null, error);
          } catch (callbackError) {
            console.error('❌ Error in GPS error callback:', callbackError);
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
      console.log('🛑 GPS watching stopped');
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
          console.log(`📍 Current Position: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${Math.round(location.accuracy || 0)}m)`);
          resolve(location);
        },
        (error) => {
          console.error('❌ Get Position Error:', error.message);
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
      console.log('📋 Using cached result for:', query);
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
          console.warn('⚠️ Google Geocoding failed:', error.message);
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
      console.error('❌ Address search failed:', error.message);
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
          
          console.log(`✅ Google found ${formattedResults.length} results for: ${query}`);
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

      console.log(`✅ Nominatim found ${results.length} results for: ${query}`);
      return results;

    } catch (error) {
      console.error('❌ Nominatim geocoding failed:', error);
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
    console.log('🧹 GPS Service cleaned up');
  }
}

const gpsService = new GPSService();
export { gpsService };
