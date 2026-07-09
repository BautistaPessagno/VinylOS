import {
  discogsReleaseSchema,
  discogsSearchResponseSchema,
  discogsMasterVersionsResponseSchema,
  type DiscogsRelease,
  type DiscogsSearchResult,
  type DiscogsAlbumGroup,
  type DiscogsMasterVersion,
} from "./types";

const DISCOGS_API_BASE = "https://api.discogs.com";

function buildUrl(path: string, params: Record<string, string | number>) {
  const url = new URL(path, DISCOGS_API_BASE);
  url.searchParams.set("key", process.env.DISCOGS_CONSUMER_KEY ?? "");
  url.searchParams.set("secret", process.env.DISCOGS_CONSUMER_SECRET ?? "");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url;
}

async function discogsFetch(url: URL, revalidate?: number) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.DISCOGS_USER_AGENT ?? "VinylOS/0.1",
    },
    next: revalidate !== undefined ? { revalidate } : undefined,
  });

  if (res.status === 429) {
    throw new Error("Discogs rate limit exceeded, try again shortly.");
  }
  if (!res.ok) {
    throw new Error(`Discogs API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function searchReleases(
  query: string,
): Promise<DiscogsSearchResult[]> {
  const url = buildUrl("/database/search", {
    q: query,
    type: "release",
    format: "Vinyl",
    per_page: 50,
  });
  const data = await discogsFetch(url, 3600);
  return discogsSearchResponseSchema.parse(data).results;
}

export async function getRelease(discogsReleaseId: number): Promise<DiscogsRelease> {
  const url = buildUrl(`/releases/${discogsReleaseId}`, {});
  const data = await discogsFetch(url, 86400);
  return discogsReleaseSchema.parse(data);
}

/**
 * Groups vinyl search results by album (Discogs `master_id`), so a user searching
 * "Clics Modernos" sees one card instead of one row per pressing. Results with no
 * master (rare/unmastered releases) each become their own single-edition group.
 * The representative pressing is the first (top-relevance) result within the group.
 */
export async function searchVinylAlbums(query: string): Promise<DiscogsAlbumGroup[]> {
  const results = await searchReleases(query);
  const groups = new Map<string, DiscogsAlbumGroup>();

  for (const r of results) {
    const key = r.master_id ? `m:${r.master_id}` : `r:${r.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.editionCount += 1;
      continue;
    }
    groups.set(key, {
      key,
      masterId: r.master_id,
      releaseId: r.id,
      title: r.title,
      coverImage: r.cover_image || r.thumb,
      year: r.year,
      genres: r.genre ?? [],
      editionCount: 1,
    });
  }

  return [...groups.values()];
}

export async function getMasterVersions(masterId: number): Promise<DiscogsMasterVersion[]> {
  const url = buildUrl(`/masters/${masterId}/versions`, {
    format: "Vinyl",
    per_page: 100,
    sort: "released",
    sort_order: "asc",
  });
  const data = await discogsFetch(url, 3600);
  return discogsMasterVersionsResponseSchema.parse(data).versions;
}
