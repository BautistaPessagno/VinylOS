import type { DiscogsAlbumGroup } from "@/lib/discogs/types";

export type AlbumSortKey =
  | "relevance"
  | "year-desc"
  | "year-asc"
  | "artist"
  | "title"
  | "country";

export const ALBUM_SORT_OPTIONS: { value: AlbumSortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "year-desc", label: "Year (newest)" },
  { value: "year-asc", label: "Year (oldest)" },
  { value: "artist", label: "Artist (A–Z)" },
  { value: "title", label: "Title (A–Z)" },
  { value: "country", label: "Country (A–Z)" },
];

function parseYear(value?: string): number | null {
  const year = Number.parseInt(value ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

function compareText(a?: string, b?: string): number {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";
  // Absent values sort last.
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareYear(a: DiscogsAlbumGroup, b: DiscogsAlbumGroup, direction: 1 | -1): number {
  const left = parseYear(a.year);
  const right = parseYear(b.year);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (left - right) * direction;
}

/** Returns a new array of album groups sorted by the given key. `relevance` is the identity order. */
export function sortAlbumGroups(
  albums: DiscogsAlbumGroup[],
  sortKey: AlbumSortKey,
): DiscogsAlbumGroup[] {
  if (sortKey === "relevance") return [...albums];

  const sorted = [...albums];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "year-desc":
        return compareYear(a, b, -1);
      case "year-asc":
        return compareYear(a, b, 1);
      case "artist":
        return compareText(a.artist, b.artist);
      case "title":
        return compareText(a.title, b.title);
      case "country":
        return compareText(a.country, b.country);
    }
  });
  return sorted;
}

export function isAlbumSortKey(value: string): value is AlbumSortKey {
  return ALBUM_SORT_OPTIONS.some((option) => option.value === value);
}
