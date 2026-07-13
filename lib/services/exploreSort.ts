export type ExploreSort = "relevance" | "artist" | "title";

export const EXPLORE_SORT_OPTIONS: { value: ExploreSort; label: string }[] = [
  { value: "relevance", label: "Popular" },
  { value: "artist", label: "Artist (A–Z)" },
  { value: "title", label: "Title (A–Z)" },
];

export function parseExploreSort(value: string | undefined): ExploreSort {
  return EXPLORE_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ExploreSort)
    : "relevance";
}

type SortableExploreAlbum = { artist: string; album: string };

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Sorts Last.fm browse albums in memory. `relevance` keeps the incoming chart order. */
export function sortExploreAlbums<T extends SortableExploreAlbum>(
  albums: T[],
  sort: ExploreSort,
): T[] {
  if (sort === "relevance") return [...albums];

  const sorted = [...albums];
  sorted.sort((a, b) =>
    sort === "artist" ? compareText(a.artist, b.artist) : compareText(a.album, b.album),
  );
  return sorted;
}
