import type { MetadataRoute } from "next";
import { listSitemapArtists, listSitemapReleases } from "@/lib/services/catalogService";
import { listExploreGenres } from "@/lib/services/exploreService";
import { absoluteUrl } from "@/lib/site";

// The catalog grows as users add records, so re-derive hourly rather than
// freezing whatever was in the database at build time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/explore"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...listExploreGenres().map((genre) => ({
      url: absoluteUrl(`/explore?genre=${encodeURIComponent(genre)}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];

  // A sitemap that throws takes the whole deploy with it; a stale-but-valid
  // sitemap of static routes is a far better failure than a broken build.
  try {
    const [releases, artists] = await Promise.all([
      listSitemapReleases(),
      listSitemapArtists(),
    ]);

    return [
      ...staticRoutes,
      ...releases.map((release) => ({
        url: absoluteUrl(`/album/${release.releaseId}`),
        lastModified: release.fetchedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...artists.map((artist) => ({
        url: absoluteUrl(`/artist/${artist.discogsArtistId}`),
        lastModified: artist.fetchedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    console.error("sitemap: catalog query failed, serving static routes only", error);
    return staticRoutes;
  }
}
