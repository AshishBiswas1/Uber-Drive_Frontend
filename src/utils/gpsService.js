// utils/gpsService.js - FIXED VERSION
import { googleMapsLoader } from './googleMapsLoader';

class OutdoorGPSService {
  constructor() {
    this.googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    this.isGoogleMapsReady = false;
    this.placesService = null;
    this.autocompleteService = null;
    this.cache = new Map();
    this.geocoder = null;
    
    console.log('🌍 GPS Service initialized');
  }

  // -------- Google Maps API Initialization (Modern Method) --------
  async initGoogleMaps() {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log('🗺️ Initializing Google Maps with modern APIs...');
      
      // **USE SINGLETON LOADER**
      await googleMapsLoader.loadGoogleMaps(this.googleKey);
      
      if (googleMapsLoader.isGoogleMapsLoaded()) {
        await this.initModernGoogleServices();
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Google Maps API failed to load:', error);
      return false;
    }
  }

  // **MODERN GOOGLE SERVICES INITIALIZATION**
  async initModernGoogleServices() {
    try {
      console.log('🔧 Initializing modern Google services...');

      // Initialize Geocoder (still current)
      this.geocoder = new window.google.maps.Geocoder();
      
      // **MODERN APPROACH: Use Place API instead of deprecated services**
      // Note: We'll use the new Place API for search functionality
      this.isGoogleMapsReady = true;
      
      console.log('✅ Modern Google services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize modern Google services:', error);
      this.isGoogleMapsReady = false;
    }
  }

  // **🔧 FIXED: MODERN PLACE SEARCH (without invalid radius parameter)**
  async searchAddress(query, biasAt = null) {
    if (!this.isGoogleMapsReady) {
      await this.initGoogleMaps();
    }

    if (!query || query.length < 3) {
      return [];
    }

    const cacheKey = `search_${query}_${biasAt ? biasAt.join(',') : 'no-bias'}`;
    if (this.cache.has(cacheKey)) {
      console.log(`📝 Using cached search result for: ${query}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔍 Modern place search for: "${query}"`);
      
      // **ENHANCED: Try Google Places API first, then fallback to Geocoder**
      
      // **METHOD 1: Try Google Places Text Search (more accurate for stops)**
      try {
        if (window.google?.maps?.places?.PlacesService) {
          const service = new window.google.maps.places.PlacesService(document.createElement('div'));
          const placesResults = await new Promise((resolve, reject) => {
            const request = {
              query: query,
              fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
            };

            // **FIXED: Use proper locationBias instead of invalid radius**
            if (biasAt && biasAt.length === 2) {
              request.locationBias = {
                center: new window.google.maps.LatLng(biasAt[0], biasAt[1]),
                radius: 50000 // This is valid for Places API
              };
            }

            service.textSearch(request, (results, status) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                console.warn('Places Text Search failed:', status);
                resolve([]);
              }
            });
          });

          if (placesResults.length > 0) {
            const transformedResults = placesResults.map(result => ({
              display_name: result.formatted_address || result.name,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              types: result.types,
              source: 'Google Places',
              place_id: result.place_id
            }));

            this.cache.set(cacheKey, transformedResults);
            console.log(`✅ Found ${transformedResults.length} Places results for: ${query}`);
            return transformedResults;
          }
        }
      } catch (placesError) {
        console.warn('Google Places search failed, falling back to Geocoder:', placesError);
      }

      // **METHOD 2: Fallback to Geocoder (FIXED - removed invalid radius)**
      const results = await new Promise((resolve, reject) => {
        const request = {
          address: query,
          componentRestrictions: {}, // Can add country restrictions if needed
        };

        // **🔧 FIXED: Add location bias WITHOUT radius (Geocoder doesn't support radius)**
        if (biasAt && biasAt.length === 2) {
          request.location = new window.google.maps.LatLng(biasAt[0], biasAt[1]);
          // **REMOVED: request.radius = 50000; ← This was causing InvalidValueError**
        }

        this.geocoder.geocode(request, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            console.warn('Geocoding failed:', status);
            resolve([]);
          }
        });
      });

      // Transform results to consistent format
      const transformedResults = results.map(result => ({
        display_name: result.formatted_address,
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        types: result.types,
        source: 'Google Geocoder',
        place_id: result.place_id
      }));

      // Cache results
      this.cache.set(cacheKey, transformedResults);
      console.log(`✅ Found ${transformedResults.length} Geocoder results for: ${query}`);
      
      return transformedResults;
    } catch (error) {
      console.error('Modern place search failed:', error);
      return [];
    }
  }

  // **REVERSE GEOCODING (Updated)**
  async getLocationName(lat, lng) {
    if (!this.isGoogleMapsReady) {
      await this.initGoogleMaps();
    }

    const cacheKey = `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔍 Reverse geocoding: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      const results = await new Promise((resolve, reject) => {
        this.geocoder.geocode(
          { location: { lat: lat, lng: lng } },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0].formatted_address);
            } else {
              console.warn('Reverse geocoding failed:', status);
              resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
        );
      });

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  // **GPS ACCURACY STATUS**
  getAccuracyStatus(accuracy) {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Very Good';
    if (accuracy <= 20) return 'Good';
    if (accuracy <= 50) return 'Fair';
    if (accuracy <= 100) return 'City-level';
    return 'Area-level';
  }

  // **CLEAR CACHE**
  clearCache() {
    this.cache.clear();
    console.log('🧹 GPS service cache cleared');
  }
}

// Export singleton instance
export const gpsService = new OutdoorGPSService();
