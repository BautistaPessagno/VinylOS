import { getTopAlbumsByGenre } from "@/lib/lastfm/client";

/**
 * Genre chips for the Explore tab. A curated, stable set (Last.fm's chart.gettoptags
 * is noisy) that maps cleanly onto Last.fm's tag.gettopalbums.
 */
const EXPLORE_GENRES = [
  "rock",
  "pop",
  "jazz",
  "hip hop",
  "electronic",
  "soul",
  "folk",
  "metal",
  "punk",
  "classical",
  "reggae",
  "blues",
  "funk",
  "indie",
];

export function listExploreGenres(): string[] {
  return EXPLORE_GENRES;
}

export type ExploreAlbum = { artist: string; album: string; imageUrl: string };

/** Top albums for a genre, sourced from Last.fm — no Discogs calls (resolved on click). */
export async function listExploreAlbums(genre: string): Promise<ExploreAlbum[]> {
  return getTopAlbumsByGenre(genre);
}
