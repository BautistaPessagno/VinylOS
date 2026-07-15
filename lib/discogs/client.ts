import {
  discogsReleaseSchema,
  discogsSearchResponseSchema,
  discogsMasterVersionsResponseSchema,
  discogsArtistSchema,
  type DiscogsRelease,
  type DiscogsSearchResult,
  type DiscogsAlbumGroup,
  type DiscogsAlbumPage,
  type DiscogsArtist,
  type DiscogsArtistSearchResult,
  type DiscogsMasterVersion,
} from "./types";
import {
  groupDiscogsAlbums,
  mapDiscogsArtists,
  toDiscogsAlbumPage,
} from "./searchResults";
import { isSearchQueryReady, normalizeSearchQuery } from "@/lib/search/searchQuery";

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
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) return [];

  const url = buildUrl("/database/search", {
    q: normalizedQuery,
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
  return groupDiscogsAlbums(results);
}

/**
 * Searches vinyl releases containing a track whose title matches the query, grouped
 * by album. Discogs does not return which track matched — callers resolve that via
 * the release tracklist (see `findBestTrack`).
 */
export async function searchVinylAlbumsByTrack(
  query: string,
): Promise<DiscogsAlbumGroup[]> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) return [];

  const url = buildUrl("/database/search", {
    track: normalizedQuery,
    type: "release",
    format: "Vinyl",
    per_page: 25,
  });
  const data = await discogsFetch(url, 3600);
  return groupDiscogsAlbums(discogsSearchResponseSchema.parse(data).results);
}

export async function searchArtists(
  query: string,
): Promise<DiscogsArtistSearchResult[]> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) return [];

  const url = buildUrl("/database/search", {
    q: normalizedQuery,
    type: "artist",
    per_page: 8,
  });
  const data = await discogsFetch(url, 3600);
  const response = discogsSearchResponseSchema.parse(data);
  return mapDiscogsArtists(response.results);
}

export async function getArtist(discogsArtistId: number): Promise<DiscogsArtist> {
  const url = buildUrl(`/artists/${discogsArtistId}`, {});
  const data = await discogsFetch(url, 86400);
  return discogsArtistSchema.parse(data);
}

export async function searchArtistVinylAlbums(
  artistName: string,
  page: number,
): Promise<DiscogsAlbumPage> {
  const normalizedArtist = normalizeSearchQuery(artistName);
  if (!isSearchQueryReady(normalizedArtist)) {
    return { albums: [], page: 1, pages: 1, totalItems: 0 };
  }

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const url = buildUrl("/database/search", {
    artist: normalizedArtist,
    type: "release",
    format: "Vinyl",
    per_page: 50,
    page: safePage,
  });
  const data = await discogsFetch(url, 3600);
  const response = discogsSearchResponseSchema.parse(data);
  return toDiscogsAlbumPage(response.results, response.pagination);
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
