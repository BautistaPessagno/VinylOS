import { lastfmArtistInfoSchema } from "./types";

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
