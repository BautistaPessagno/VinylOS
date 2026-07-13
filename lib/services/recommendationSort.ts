export type RecommendationSort =
  | "relevance"
  | "year-desc"
  | "year-asc"
  | "artist"
  | "title";

export const RECOMMENDATION_SORT_OPTIONS: {
  value: RecommendationSort;
  label: string;
}[] = [
  { value: "relevance", label: "Best match" },
  { value: "year-desc", label: "Year (newest)" },
  { value: "year-asc", label: "Year (oldest)" },
  { value: "artist", label: "Artist (A–Z)" },
  { value: "title", label: "Title (A–Z)" },
];

export function parseRecommendationSort(
  value: string | undefined,
): RecommendationSort {
  return RECOMMENDATION_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as RecommendationSort)
    : "relevance";
}

type SortableRecommendation = {
  title: string;
  year: number | null;
  artistNames: string[];
  genres: string[];
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareYear(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // missing years sort last
  if (b === null) return -1;
  return (a - b) * direction;
}

/** Sorts recommendations in memory. `relevance` keeps the incoming (score) order. */
export function sortRecommendations<T extends SortableRecommendation>(
  items: T[],
  sort: RecommendationSort,
): T[] {
  if (sort === "relevance") return [...items];

  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sort) {
      case "year-desc":
        return compareYear(a.year, b.year, -1);
      case "year-asc":
        return compareYear(a.year, b.year, 1);
      case "artist":
        return compareText(a.artistNames[0] ?? "", b.artistNames[0] ?? "");
      case "title":
        return compareText(a.title, b.title);
    }
  });
  return sorted;
}

export function filterRecommendationsByGenre<T extends SortableRecommendation>(
  items: T[],
  genre: string | undefined,
): T[] {
  const target = genre?.trim().toLowerCase();
  if (!target) return items;
  return items.filter((item) =>
    item.genres.some((g) => g.trim().toLowerCase() === target),
  );
}

/** Distinct genres present across the recommendation set, sorted for the filter datalist. */
export function collectRecommendationGenres(
  items: SortableRecommendation[],
): string[] {
  const genres = new Set<string>();
  for (const item of items) {
    for (const genre of item.genres) {
      const trimmed = genre.trim();
      if (trimmed) genres.add(trimmed);
    }
  }
  return [...genres].sort((a, b) => compareText(a, b));
}
