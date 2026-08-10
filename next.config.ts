import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Lets the landing search bar morph into Explore's on navigation.
    viewTransition: true,
  },
  // Don't advertise the framework and its version to scanners.
  poweredByHeader: false,
  images: {
    // Cover art and artist photos are served from Discogs' image CDN.
    remotePatterns: [
      { protocol: "https", hostname: "i.discogs.com" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // Send the origin cross-site so Discogs/Last.fm still see referrals,
          // but never leak the path of a signed-in page.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
