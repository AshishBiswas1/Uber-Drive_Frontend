/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add an alias for mapbox-gl to point to maplibre-gl
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
    return config;
  },
};

// Use 'export default' for ES Modules
export default nextConfig;
