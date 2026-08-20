import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces and auth plumbing: never useful in a search result,
      // and every one of them redirects a crawler to /login anyway.
      //
      // /login is deliberately absent — it carries `noindex`, and a crawler has
      // to be allowed to fetch the page to ever see that.
      disallow: [
        "/api/",
        "/auth/",
        "/collection",
        "/wishlist",
        "/friends",
        "/recommendations",
        "/settings",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
