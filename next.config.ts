import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/sitemap.xml",
          destination: "/api/sitemap-index",
        },
      ],
    };
  },
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