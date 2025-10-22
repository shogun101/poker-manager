import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Farcaster Frame SDK
  reactStrictMode: true,

  // Allow Farcaster domains for images/resources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.farcaster.xyz',
      },
    ],
  },
};

export default nextConfig;
