import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.lintelligent.tv" }],
        destination: "https://lintelligent.tv/:path*",
        permanent: true,
      },
    ];
  },
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