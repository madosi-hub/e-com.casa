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
      {
        protocol: "https",
        hostname: "media.discordapp.net",
        pathname: "/attachments/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/attachments/**",
      },
    ],
  },
};

export default nextConfig;
