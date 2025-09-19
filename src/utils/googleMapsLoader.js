// utils/googleMapsLoader.js
class GoogleMapsLoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }

  async loadGoogleMaps(apiKey) {
    // If already loaded, return immediately
    if (this.isLoaded && window.google?.maps) {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Script exists, wait for it to load
        if (window.google?.maps) {
          this.isLoaded = true;
          this.isLoading = false;
          resolve();
        } else {
          // Wait for existing script to finish loading
          existingScript.onload = () => {
            this.isLoaded = true;
            this.isLoading = false;
            resolve();
          };
          existingScript.onerror = () => {
            this.isLoading = false;
            reject(new Error('Failed to load existing Google Maps script'));
          };
        }
        return;
      }

      // **MODERN BOOTSTRAP LOADER METHOD**
      const script = document.createElement('script');
      script.innerHTML = `
        (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
          key: "${apiKey}",
          v: "weekly",
          loading: "async"
        });
      `;

      // Wait for the bootstrap to initialize
      setTimeout(async () => {
        try {
          if (window.google?.maps?.importLibrary) {
            // Load required libraries
            await Promise.all([
              window.google.maps.importLibrary("maps"),
              window.google.maps.importLibrary("places"),
              window.google.maps.importLibrary("geometry"),
              window.google.maps.importLibrary("marker") // For AdvancedMarkerElement
            ]);
            
            this.isLoaded = true;
            this.isLoading = false;
            resolve();
          } else {
            throw new Error('Google Maps bootstrap failed');
          }
        } catch (error) {
          this.isLoading = false;
          reject(error);
        }
      }, 1000);

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  isGoogleMapsLoaded() {
    return this.isLoaded && window.google?.maps;
  }
}

// Export singleton instance
export const googleMapsLoader = new GoogleMapsLoader();
