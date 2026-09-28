import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media.tamarind.co.ke",
      },
      {
        protocol: "http",
        hostname: "media.tamarind.co.ke",
      },
    ],
  },
};

export default nextConfig;
