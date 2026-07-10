import {
  lastfmArtistInfoSchema,
  lastfmSimilarArtistsSchema,
  lastfmAlbumInfoSchema,
  lastfmTopAlbumsSchema,
  lastfmTopTagsSchema,
} from "./types";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

/** Last.fm image arrays run small → extralarge; pick the largest non-empty url. */
function largestImage(images?: { "#text"?: string; size?: string }[]): string {
  if (!images) return "";
  for (let i = images.length - 1; i >= 0; i--) {
    const url = images[i]?.["#text"];
    if (url) return url;
  }
  return "";
}

function lastfmUrl(method: string, params: Record<string, string>) {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", process.env.LASTFM_API_KEY ?? "");
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

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

/** Album write-up + tags for the album detail page. Returns null if not found. */
export async function getAlbumInfo(artist: string, album: string) {
  const url = lastfmUrl("album.getinfo", { artist, album });
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const parsed = lastfmAlbumInfoSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  const a = parsed.data.album;
  const tags =
    typeof a.tags === "object" ? (a.tags.tag ?? []).map((t) => t.name) : [];
  return {
    name: a.name,
    imageUrl: largestImage(a.image),
    summary: a.wiki?.summary,
    tags,
  };
}

/** Top albums for a genre/tag, for the Explore grid. Returns [] if not found. */
export async function getTopAlbumsByGenre(
  tag: string,
  limit = 30,
): Promise<{ artist: string; album: string; imageUrl: string }[]> {
  const url = lastfmUrl("tag.gettopalbums", { tag, limit: String(limit) });
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const parsed = lastfmTopAlbumsSchema.safeParse(await res.json());
  if (!parsed.success) return [];

  return (parsed.data.albums.album ?? [])
    .filter((a) => a.artist?.name)
    .map((a) => ({
      artist: a.artist!.name,
      album: a.name,
      imageUrl: largestImage(a.image),
    }));
}

/** Globally popular genres/tags, for the Explore genre chips. Returns [] if not found. */
export async function getTopTags(limit = 20): Promise<string[]> {
  const url = lastfmUrl("chart.gettoptags", { limit: String(limit) });
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const parsed = lastfmTopTagsSchema.safeParse(await res.json());
  if (!parsed.success) return [];

  return (parsed.data.toptags.tag ?? []).map((t) => t.name);
}
