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
  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
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
  
  // ✅ HYDRATION FIX: Add rewrites for API calls
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/:path*`
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
      }
    ];
  },
  
  // ✅ HYDRATION FIX: Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  
  // ✅ HYDRATION FIX: Optimize for payment pages
  transpilePackages: ['@stripe/stripe-js'],
  
  // ✅ HYDRATION FIX: Runtime config for client-side env variables
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  }
};

export default nextConfig;
