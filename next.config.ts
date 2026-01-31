import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['k.kakaocdn.net'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
