import type {
  DiscogsAlbumGroup,
  DiscogsAlbumPage,
  DiscogsArtistSearchResult,
  DiscogsPagination,
  DiscogsSearchResult,
} from "./types";

export function splitDiscogsTitle(value: string): { artist: string; title: string } {
  const separatorIndex = value.indexOf(" - ");
  if (separatorIndex === -1) {
    return { artist: "Unknown artist", title: value };
  }

  return {
    artist: value.slice(0, separatorIndex).trim() || "Unknown artist",
    title: value.slice(separatorIndex + 3).trim() || value,
  };
}

export function groupDiscogsAlbums(
  results: DiscogsSearchResult[],
): DiscogsAlbumGroup[] {
  const groups = new Map<string, DiscogsAlbumGroup>();

  for (const result of results) {
    const key = result.master_id ? `m:${result.master_id}` : `r:${result.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.editionCount += 1;
      continue;
    }

    const { artist, title } = splitDiscogsTitle(result.title);
    groups.set(key, {
      key,
      masterId: result.master_id ?? undefined,
      releaseId: result.id,
      artist,
      title,
      coverImage: result.cover_image || result.thumb || undefined,
      year: result.year ?? undefined,
      country: result.country ?? undefined,
      genres: result.genre ?? [],
      editionCount: 1,
    });
  }

  return [...groups.values()];
}

export function mapDiscogsArtists(
  results: DiscogsSearchResult[],
): DiscogsArtistSearchResult[] {
  return results
    .filter((result) => result.type === "artist")
    .map((result) => ({
      id: result.id,
      name: result.title,
      imageUrl: result.cover_image || undefined,
      thumbUrl: result.thumb || undefined,
    }));
}

export function toDiscogsAlbumPage(
  results: DiscogsSearchResult[],
  pagination?: DiscogsPagination,
): DiscogsAlbumPage {
  return {
    albums: groupDiscogsAlbums(results),
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
    totalItems: pagination?.items ?? results.length,
  };
}
