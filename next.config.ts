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
};

export default nextConfig;
