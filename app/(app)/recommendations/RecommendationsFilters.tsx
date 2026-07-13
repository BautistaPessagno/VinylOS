import Link from "next/link";
import {
  RECOMMENDATION_SORT_OPTIONS,
  type RecommendationSort,
} from "@/lib/services/recommendationSort";

export function RecommendationsFilters({
  selectedGenre,
  selectedSort,
  genres,
}: {
  selectedGenre?: string;
  selectedSort: RecommendationSort;
  genres: string[];
}) {
  const hasActiveFilters = Boolean(selectedGenre) || selectedSort !== "relevance";

  return (
    <form className="flex flex-wrap gap-2 text-sm" action="/recommendations">
      <label className="sr-only" htmlFor="rec-filter-genre">
        Genre
      </label>
      <input
        id="rec-filter-genre"
        name="genre"
        defaultValue={selectedGenre}
        list="rec-genre-options"
        placeholder="Genre"
        className="min-w-32 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <datalist id="rec-genre-options">
        {genres.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>

      <label className="sr-only" htmlFor="rec-sort">
        Sort by
      </label>
      <select
        id="rec-sort"
        name="sort"
        defaultValue={selectedSort}
        className="min-w-40 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      >
        {RECOMMENDATION_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>

      <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5">
        Apply
      </button>
      {hasActiveFilters && (
        <Link href="/recommendations" className="px-3 py-1.5 text-zinc-500 underline">
          Clear
        </Link>
      )}
    </form>
  );
}
