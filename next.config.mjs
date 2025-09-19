/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ HYDRATION FIX: Temporarily disable React strict mode for payment pages
  reactStrictMode: false, // This prevents double renders that cause hydration issues
  
  // Configure both Webpack and Turbopack
  experimental: {
    turbo: {
      resolveAlias: {
        'mapbox-gl': 'maplibre-gl'
      }
    }
  },
  
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
    
    // ✅ FIXED: Only apply console removal in Webpack (not Turbopack)
    if (!dev && !isServer) {
      // Remove console logs in production build (Webpack only)
      const TerserPlugin = require('terser-webpack-plugin');
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          },
        })
      );
    }
    
    return config;
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.gstatic.com',
      },
      // ✅ ADD: Support for Stripe and payment images
      {
        protocol: 'https',
        hostname: 'img.stripe.com',
      },
      {
        protocol: 'https',
        hostname: 'js.stripe.com',
      },
    ],
  },
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // ✅ HYDRATION FIX: Add rewrites for API calls and favicon
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/:path*`
      },
      // ✅ FAVICON: Custom favicon rewrite
      {
        source: '/favicon.ico',
        destination: '/assets/favicon.png', // Change this path to match your favicon location
      }
    ];
  },
  
  // ✅ HYDRATION FIX: Headers to prevent caching issues
  async headers() {
    return [
      {
        source: '/payment-success/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma', 
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      },
      {
        source: '/payment-cancel/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      },
      // ✅ FAVICON: Add proper caching headers for favicon
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400'
          },
          {
            key: 'Content-Type',
            value: 'image/x-icon'
          }
        ]
      }
    ];
  },
  
  // ✅ REMOVED: compiler.removeConsole (not supported by Turbopack)
  // Console removal is now handled in the webpack function above
  
  // ✅ HYDRATION FIX: Optimize for payment pages
  transpilePackages: ['@stripe/stripe-js'],
  
  // ✅ HYDRATION FIX: Runtime config for client-side env variables
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  }
};

export default nextConfig;
