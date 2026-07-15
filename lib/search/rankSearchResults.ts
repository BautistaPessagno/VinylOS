import type { DiscogsTrack } from "@/lib/discogs/types";
import { normalizeSearchQuery } from "./searchQuery";

export type SectionKey = "artists" | "albums" | "songs";

/** How well `candidate` matches the query: exact=3, prefix=2, contains=1, else 0. */
export function matchScore(query: string, candidate: string): 0 | 1 | 2 | 3 {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedCandidate = normalizeSearchQuery(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedQuery) return 3;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 2;
  if (normalizedCandidate.includes(normalizedQuery)) return 1;
  return 0;
}

/**
 * Picks the tracklist entry that best matches the query (Discogs' track search does
 * not say which track matched). Headings/indexes are skipped; returns null when no
 * track scores above 0, so callers can drop the result instead of showing a wrong song.
 */
export function findBestTrack(
  query: string,
  tracklist: DiscogsTrack[],
): DiscogsTrack | null {
  let best: DiscogsTrack | null = null;
  let bestScore = 0;

  for (const track of tracklist) {
    if (track.type_ && track.type_ !== "track") continue;
    const score = matchScore(query, track.title);
    if (score > bestScore) {
      best = track;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Orders result sections by how well the query matched each type. Ties break in
 * favor of records over songs over artists, so a query that is simultaneously an
 * exact record/song title and an exact (often obscure, same-named) artist surfaces
 * the record — e.g. "stairway to heaven" leads with the record, not the band.
 */
export function rankSections(scores: {
  artistScore: number;
  albumScore: number;
  songScore: number;
}): SectionKey[] {
  const sections: { key: SectionKey; score: number }[] = [
    { key: "albums", score: scores.albumScore },
    { key: "songs", score: scores.songScore },
    { key: "artists", score: scores.artistScore },
  ];
  // Stable sort: equal scores preserve the albums > songs > artists order above.
  return sections.sort((a, b) => b.score - a.score).map((section) => section.key);
}
