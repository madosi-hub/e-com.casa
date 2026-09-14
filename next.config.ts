import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
      {
        protocol: "https",
        hostname: "www.nuraltainteriores.online",
        pathname: "/pt/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/nexflowx-hub/nuraltainteriores/main/public/pt/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/pt/:path*",
        destination: "https://www.nuraltainteriores.online/pt/:path*",
      },
    ];
  },
};

export default nextConfig;
