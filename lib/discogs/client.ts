import {
  discogsReleaseSchema,
  discogsSearchResponseSchema,
  type DiscogsRelease,
  type DiscogsSearchResult,
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
  const url = buildUrl("/database/search", { q: query, type: "release", per_page: 20 });
  const data = await discogsFetch(url, 3600);
  return discogsSearchResponseSchema.parse(data).results;
}

export async function getRelease(discogsReleaseId: number): Promise<DiscogsRelease> {
  const url = buildUrl(`/releases/${discogsReleaseId}`, {});
  const data = await discogsFetch(url, 86400);
  return discogsReleaseSchema.parse(data);
}
