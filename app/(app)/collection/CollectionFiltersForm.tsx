import Link from "next/link";
import type { CollectionFilterOptions } from "@/lib/services/collectionFilterOptions";
import {
  COLLECTION_SORT_OPTIONS,
  type CollectionSort,
} from "@/lib/services/collectionSort";

type SelectedCollectionFilters = {
  genre?: string;
  year?: string;
  label?: string;
  sort?: CollectionSort;
};

export function CollectionFiltersForm({
  selected,
  options,
}: {
  selected: SelectedCollectionFilters;
  options: CollectionFilterOptions;
}) {
  const hasActiveFilters = Boolean(
    selected.genre ||
      selected.year ||
      selected.label ||
      (selected.sort && selected.sort !== "added-desc"),
  );

  return (
    <form className="flex flex-wrap gap-2 text-sm" action="/collection">
      <label className="sr-only" htmlFor="collection-filter-genre">
        Genre
      </label>
      <input
        id="collection-filter-genre"
        name="genre"
        defaultValue={selected.genre}
        list="collection-genre-options"
        placeholder="Genre"
        className="min-w-32 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <datalist id="collection-genre-options">
        {options.genres.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>

      <label className="sr-only" htmlFor="collection-filter-year">
        Year
      </label>
      <input
        id="collection-filter-year"
        name="year"
        defaultValue={selected.year}
        list="collection-year-options"
        placeholder="Year"
        type="number"
        className="min-w-28 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <datalist id="collection-year-options">
        {options.years.map((year) => (
          <option key={year} value={String(year)} />
        ))}
      </datalist>

      <label className="sr-only" htmlFor="collection-filter-label">
        Label
      </label>
      <input
        id="collection-filter-label"
        name="label"
        defaultValue={selected.label}
        list="collection-label-options"
        placeholder="Label"
        className="min-w-32 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <datalist id="collection-label-options">
        {options.labels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      <label className="sr-only" htmlFor="collection-sort">
        Sort by
      </label>
      <select
        id="collection-sort"
        name="sort"
        defaultValue={selected.sort ?? "added-desc"}
        className="min-w-40 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
      >
        {COLLECTION_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>

      <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5">
        Filter
      </button>
      {hasActiveFilters && (
        <Link href="/collection" className="px-3 py-1.5 text-zinc-500 underline">
          Clear filters
        </Link>
      )}
    </form>
  );
}
