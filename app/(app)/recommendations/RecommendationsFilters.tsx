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
    <form className="flex flex-wrap gap-2 text-base sm:text-sm" action="/recommendations">
      <label className="sr-only" htmlFor="rec-filter-genre">
        Género
      </label>
      <input
        id="rec-filter-genre"
        name="genre"
        defaultValue={selectedGenre}
        list="rec-genre-options"
        placeholder="Género"
        className="min-h-11 min-w-32 rounded border border-room-rule px-3 py-1.5 sm:min-h-0"
      />
      <datalist id="rec-genre-options">
        {genres.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>

      <label className="sr-only" htmlFor="rec-sort">
        Ordenar por
      </label>
      <select
        id="rec-sort"
        name="sort"
        defaultValue={selectedSort}
        className="min-h-11 min-w-40 rounded border border-room-rule px-3 py-1.5 sm:min-h-0"
      >
        {RECOMMENDATION_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            Orden: {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="min-h-11 rounded border border-room-rule px-3 py-1.5 active:bg-room-sunk sm:min-h-0"
      >
        Apply
      </button>
      {hasActiveFilters && (
        <Link
          href="/recommendations"
          className="flex min-h-11 items-center px-3 py-1.5 text-room-dim underline sm:min-h-0"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
