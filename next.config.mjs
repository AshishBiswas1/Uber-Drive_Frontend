// next.config.mjs
import TerserPlugin from 'terser-webpack-plugin'; // <-- ESM import

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    turbo: {
      resolveAlias: {
        'mapbox-gl': 'maplibre-gl',
      },
    },
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };

    // Only for client production build
    if (!dev && !isServer) {
      config.optimization.minimizer = [
        ...(config.optimization.minimizer || []),
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          },
        }),
      ];
    }

    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'maps.gstatic.com' },
      { protocol: 'https', hostname: 'img.stripe.com' },
      { protocol: 'https', hostname: 'js.stripe.com' },
    ],
  },
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/:path*`,
      },
      { source: '/favicon.ico', destination: '/assets/favicon.png' }, // ensure content-type matches in headers
    ];
  },
  async headers() {
    return [
      {
        source: '/payment-success/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/payment-cancel/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          // If you rewrite to a PNG, change content-type accordingly:
          { key: 'Content-Type', value: 'image/png' },
        ],
      },
    ];
  },
  transpilePackages: ['@stripe/stripe-js'],
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
