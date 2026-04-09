import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "cms.lintelligent.tv",
      },
      {
        protocol: "https",
        hostname: "cms.lintelligent.tv",
      },
    ],
  },
};

export default nextConfig;