import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Lets the landing search bar morph into Explore's on navigation.
    viewTransition: true,
  },
};

export default nextConfig;
