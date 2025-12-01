import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Farcaster Frame SDK
  reactStrictMode: true,

  // Allow external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.farcaster.xyz',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
      },
    ],
  },

  // Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.farcaster.xyz https://*.coinbase.com",
              "connect-src 'self' https://*.farcaster.xyz https://*.coinbase.com https://client.farcaster.xyz https://cca-lite.coinbase.com https://*.supabase.co https://*.neynar.com https://*.base.org https://*.publicnode.com wss://*.supabase.co",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-src 'self' https://*.farcaster.xyz https://*.coinbase.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
