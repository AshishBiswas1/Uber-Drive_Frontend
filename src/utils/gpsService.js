'use client';

class OutdoorGPSService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.callbacks = new Set();
    this.isWatching = false;
    this.locationCache = new Map();
    this.isLaptop = null;
    this.lastPositionTime = null;
    this.targetAccuracy = 50; // Accept up to 50m for outdoor GPS
    this.maxAcceptableAccuracy = 100; // Reject anything worse than 100m
    
    // LocationIQ configuration (FREE 5,000 requests/day)
    this.locationiqKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;
  }

  /**
   * Detect if running on laptop/desktop vs mobile (only on client side)
   */
  detectLaptop() {
    if (this.isLaptop !== null) {
      return this.isLaptop;
    }

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.isLaptop = true;
      return this.isLaptop;
    }

    try {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
      
      this.isLaptop = !isMobile && !isTablet;
      return this.isLaptop;
    } catch (error) {
      console.warn('Device detection failed, assuming laptop:', error);
      this.isLaptop = true;
      return this.isLaptop;
    }
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Validate if coordinates are within India
   */
  isValidIndianCoords(lat, lng) {
    const minLat = 6.4627;
    const maxLat = 37.6;
    const minLng = 68.1766;
    const maxLng = 97.4025;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  /**
   * LocationIQ Geocoding (FREE 5,000 requests/day)
   */
  async searchWithLocationIQ(query) {
    if (!this.locationiqKey) {
      throw new Error('LocationIQ API key not configured. Get free key from https://locationiq.com');
    }

    try {
      console.log('🗺️ LocationIQ search for:', query);
      
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?` +
        `key=${this.locationiqKey}&` +
        `q=${encodeURIComponent(query)}&` +
        `countrycodes=in&` +
        `format=json&limit=5&` +
        `addressdetails=1`
      );

      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          source: 'LocationIQ'
        })).filter(item => this.isValidIndianCoords(item.lat, item.lng));
      }
      
      return [];
    } catch (error) {
      console.error('LocationIQ geocoding error:', error);
      throw error;
    }
  }

  /**
   * OpenStreetMap Fallback (using your existing API)
   */
  async searchWithOpenStreetMap(query) {
    try {
      console.log('🗺️ OpenStreetMap fallback search for:', query);
      
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      if (data && data.length > 0) {
        return data.slice(0, 5).map(result => ({
          display_name: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          source: 'OpenStreetMap'
        })).filter(item => this.isValidIndianCoords(item.lat, item.lng));
      }
      
      return [];
    } catch (error) {
      console.error('OpenStreetMap geocoding error:', error);
      throw error;
    }
  }

  /**
   * Enhanced address search with LocationIQ + fallbacks
   */
  async searchAddress(query) {
    if (!query || query.length < 3) return [];

    console.log('🔍 Enhanced geocoding for:', query);

    // Try search variations for better results
    const searchVariations = [
      query, // Original query
      query.replace(/,/g, ' '), // Remove commas
      query.split(',')[0].trim(), // First part only
      query.split(',').slice(0, 2).join(', ').trim(), // First two parts
      `${query.split(',')[0].trim()}, Haridwar`, // Location + Haridwar
      `${query.split(',')[0].trim()}, Uttarakhand`, // Location + State
    ];

    // Try LocationIQ first (best for Indian locations + FREE)
    for (const variation of searchVariations) {
      if (!variation || variation.length < 3) continue;

      try {
        console.log(`🔍 LocationIQ trying: "${variation}"`);
        const results = await this.searchWithLocationIQ(variation);
        
        if (results && results.length > 0) {
          console.log(`✅ LocationIQ found ${results.length} results`);
          return results.slice(0, 5);
        }
      } catch (error) {
        console.warn(`❌ LocationIQ failed for "${variation}":`, error.message);
        continue;
      }
    }

    // Fallback to OpenStreetMap if LocationIQ fails
    for (const variation of searchVariations) {
      if (!variation || variation.length < 3) continue;

      try {
        console.log(`🔍 OpenStreetMap fallback trying: "${variation}"`);
        const results = await this.searchWithOpenStreetMap(variation);
        
        if (results && results.length > 0) {
          console.log(`✅ OpenStreetMap found ${results.length} results`);
          return results.slice(0, 5);
        }
      } catch (error) {
        console.warn(`❌ OpenStreetMap failed for "${variation}":`, error.message);
        continue;
      }
    }

    console.warn('❌ All geocoding providers and variations failed for:', query);
    return [];
  }

  /**
   * Reverse geocoding with LocationIQ + OpenStreetMap fallback
   */
  async getLocationName(lat, lng) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey);
    }

    if (typeof window === 'undefined') {
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return fallback;
    }

    // Try LocationIQ first
    try {
      if (this.locationiqKey) {
        const response = await fetch(
          `https://us1.locationiq.com/v1/reverse.php?` +
          `key=${this.locationiqKey}&` +
          `lat=${lat}&lon=${lng}&` +
          `format=json&` +
          `addressdetails=1`
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            const addressParts = data.display_name.split(',').map(part => part.trim());
            const cleanAddress = addressParts.slice(0, 3).join(', ');
            if (cleanAddress && cleanAddress.length > 5) {
              this.locationCache.set(cacheKey, cleanAddress);
              return cleanAddress;
            }
          }
        }
      }
    } catch (error) {
      console.warn('LocationIQ reverse geocoding failed:', error);
    }

    // Fallback to OpenStreetMap
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await response.json();

      if (!data.error && data && data.display_name) {
        const addressParts = data.display_name.split(',').map(part => part.trim());
        const cleanAddress = addressParts.slice(0, 3).join(', ');
        
        if (cleanAddress && cleanAddress.length > 5) {
          this.locationCache.set(cacheKey, cleanAddress);
          return cleanAddress;
        }
      }
    } catch (error) {
      console.warn('OpenStreetMap reverse geocoding failed:', error);
    }

    // Final fallback
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    this.locationCache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Strict validation - only accept high accuracy GPS
   */
  isPositionValid(position) {
    if (!position || !position.coords) {
      return { valid: false, reason: 'No coordinates provided' };
    }

    const accuracy = position.coords.accuracy;
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    if (lat === 0 && lng === 0) {
      return { valid: false, reason: 'Invalid coordinates (0,0)' };
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { valid: false, reason: 'Coordinates out of range' };
    }

    if (isNaN(accuracy) || accuracy < 0) {
      return { valid: false, reason: 'Invalid accuracy value' };
    }

    // Strict accuracy requirements for outdoor GPS
    if (accuracy > this.maxAcceptableAccuracy) {
      return { 
        valid: false, 
        reason: `GPS accuracy insufficient: ±${Math.round(accuracy)}m (need ≤${this.maxAcceptableAccuracy}m). Please go outdoors for better GPS signal.` 
      };
    }

    let quality = 'Unknown';
    if (accuracy <= 10) quality = 'Excellent GPS (±10m)';
    else if (accuracy <= 20) quality = 'Very Good GPS (±20m)';
    else if (accuracy <= 50) quality = 'Good GPS (±50m)';
    else quality = 'Fair GPS';

    return { valid: true, reason: `${quality} - Outdoor GPS successful` };
  }

  /**
   * High-accuracy outdoor GPS only
   */
  async getOutdoorGPS() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('GPS_TIMEOUT: Could not get accurate GPS signal within 45 seconds. Please ensure you are outdoors with clear sky visibility.'));
      }, 45000); // 45 seconds for GPS satellites

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          const accuracy = position.coords.accuracy;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const validation = this.isPositionValid(position);
          
          if (validation.valid) {
            this.currentPosition = position;
            this.lastPositionTime = Date.now();
            resolve(position);
          } else {
            reject(new Error(`GPS_POOR_ACCURACY: ${validation.reason}`));
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          
          let errorMessage = 'GPS_ERROR: ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied. Please enable location permissions in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'GPS satellites unavailable. Please move outdoors to an area with clear sky visibility.';
              break;
            case error.TIMEOUT:
              errorMessage += 'GPS timeout. Please move outdoors and ensure GPS is enabled on your device.';
              break;
            default:
              errorMessage += 'GPS positioning failed. Please try outdoors with GPS enabled.';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,   // Force GPS satellites only
          maximumAge: 0,              // No cached positions
          timeout: 40000              // 40 seconds for satellites
        }
      );
    });
  }

  /**
   * Main positioning method - outdoor GPS or manual entry prompt
   */
  async getCurrentPosition() {
    try {
      const position = await this.getOutdoorGPS();
      return position;
    } catch (error) {
      throw error; // Let the UI handle the manual entry prompt
    }
  }

  async getCurrentPositionWithName(context = 'general') {
    try {
      const position = await this.getCurrentPosition();
      const locationName = await this.getLocationName(
        position.coords.latitude, 
        position.coords.longitude
      );
      
      return {
        position,
        locationName,
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start watching position - only for high accuracy outdoor GPS
   */
  startWatching(callback) {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      callback(null, new Error('Geolocation not supported'));
      return;
    }

    this.callbacks.add(callback);

    if (this.isWatching) {
      if (this.currentPosition) {
        callback(this.currentPosition, null);
      }
      return;
    }

    this.isWatching = true;
    this.tryGetInitialPosition(callback);
  }

  startWatchingWithNames(callback) {
    const wrappedCallback = async (position, error) => {
      if (error) {
        callback(null, null, error);
        return;
      }

      try {
        const locationName = await this.getLocationName(
          position.coords.latitude,
          position.coords.longitude
        );

        callback(position, locationName, null);
      } catch (geocodeError) {
        callback(position, `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, null);
      }
    };

    this.startWatching(wrappedCallback);
  }

  async tryGetInitialPosition(callback) {
    try {
      const position = await this.getCurrentPosition();
      
      this.callbacks.forEach(cb => {
        try {
          cb(position, null);
        } catch (err) {
          // Silent error handling
        }
      });

      this.startContinuousWatch();
      
    } catch (error) {
      // Pass error to UI instead of console logging
      this.callbacks.forEach(cb => {
        try {
          cb(null, error);
        } catch (err) {
          // Silent error handling
        }
      });

      // Don't log to console - let UI handle the message
    }
  }

  startContinuousWatch() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    // Only watch if we have good initial position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const validation = this.isPositionValid(position);
        
        if (validation.valid) {
          if (this.shouldAcceptNewPosition(position)) {
            this.currentPosition = position;
            this.lastPositionTime = Date.now();

            this.callbacks.forEach(cb => {
              try {
                cb(position, null);
              } catch (err) {
                // Silent error handling
              }
            });
          }
        } else {
          // Send validation error to UI instead of console
          this.callbacks.forEach(cb => {
            try {
              cb(null, new Error(validation.reason));
            } catch (err) {
              // Silent error handling
            }
          });
        }
      },
      (error) => {
        // Send error to UI instead of console
        this.callbacks.forEach(cb => {
          try {
            cb(null, error);
          } catch (err) {
            // Silent error handling
          }
        });
      },
      {
        enableHighAccuracy: true,   // High accuracy for continuous watching
        maximumAge: 30000,          // 30-second cache for continuous updates
        timeout: 20000              // 20-second timeout for continuous updates
      }
    );
  }

  shouldAcceptNewPosition(newPosition) {
    if (!this.currentPosition) return true;

    const newAccuracy = newPosition.coords.accuracy;
    const currentAccuracy = this.currentPosition.coords.accuracy;
    const timeDiff = newPosition.timestamp - this.currentPosition.timestamp;

    // Only accept if accuracy is good enough
    if (newAccuracy > this.maxAcceptableAccuracy) {
      return false;
    }

    // Accept if significantly more accurate
    if (newAccuracy < currentAccuracy * 0.7) {
      return true;
    }

    // Accept if reasonably newer and not much worse
    if (timeDiff > 60000 && newAccuracy < currentAccuracy * 1.2) {
      return true;
    }

    return false;
  }

  stopWatching(callback = null) {
    if (callback) {
      this.callbacks.delete(callback);
    }

    if (this.callbacks.size === 0 && this.watchId !== null) {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(this.watchId);
      }
      this.watchId = null;
      this.isWatching = false;
    }
  }

  getAccuracyStatus(accuracy) {
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 20) return 'Very Good';
    if (accuracy <= 50) return 'Good';
    if (accuracy <= 100) return 'Fair';
    return 'Poor';
  }

  getLastKnownPosition() {
    return this.currentPosition;
  }

  clearCache() {
    this.currentPosition = null;
    this.lastPositionTime = null;
    this.locationCache.clear();
    console.log('🧹 GPS cache cleared');
  }
}

export const gpsService = new OutdoorGPSService();
