import { lastfmArtistInfoSchema, lastfmSimilarArtistsSchema } from "./types";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

/** Supplementary artist bio for the search-add confirm screen. Returns null if not found. */
export async function getArtistInfo(artistName: string) {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", "artist.getinfo");
  url.searchParams.set("artist", artistName);
  url.searchParams.set("api_key", process.env.LASTFM_API_KEY ?? "");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  const parsed = lastfmArtistInfoSchema.safeParse(data);
  return parsed.success ? parsed.data.artist : null;
}

/** Artists similar to `artistName`, per Last.fm's `artist.getsimilar`. Returns [] if not found. */
export async function getSimilarArtists(
  artistName: string,
): Promise<{ name: string; match: number }[]> {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", "artist.getsimilar");
  url.searchParams.set("artist", artistName);
  url.searchParams.set("limit", "20");
  url.searchParams.set("api_key", process.env.LASTFM_API_KEY ?? "");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const data = await res.json();
  const parsed = lastfmSimilarArtistsSchema.safeParse(data);
  if (!parsed.success) return [];

  return (parsed.data.similarartists.artist ?? []).map((a) => ({
    name: a.name,
    match: a.match ?? 0,
  }));
}
