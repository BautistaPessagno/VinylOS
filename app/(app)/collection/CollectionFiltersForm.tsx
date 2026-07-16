"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { CollectionFilterOptions } from "@/lib/services/collectionFilterOptions";
import {
  COLLECTION_SORT_OPTIONS,
  type CollectionSort,
} from "@/lib/services/collectionSort";

type SelectedCollectionFilters = {
  q?: string;
  genre?: string;
  year?: string;
  label?: string;
  sort?: CollectionSort;
};

const inputClass =
  "min-h-11 rounded border border-zinc-300 px-3 py-1.5 sm:min-h-0 dark:border-zinc-700 dark:bg-zinc-950";

export function CollectionFiltersForm({
  selected,
  options,
}: {
  selected: SelectedCollectionFilters;
  options: CollectionFilterOptions;
}) {
  const panelId = useId();
  // Count of filters hidden behind the mobile disclosure, shown on its trigger.
  const panelFilterCount = [selected.genre, selected.year, selected.label].filter(
    Boolean,
  ).length;
  const [panelOpen, setPanelOpen] = useState(panelFilterCount > 0);
  const hasActiveFilters = Boolean(
    selected.q ||
      panelFilterCount > 0 ||
      (selected.sort && selected.sort !== "added-desc"),
  );

  return (
    <form
      className="flex flex-col gap-2 text-base sm:text-sm"
      action="/collection"
    >
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="collection-search">
          Search your collection
        </label>
        <input
          id="collection-search"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={selected.q}
          placeholder="Search title or artist"
          className={`${inputClass} min-w-0 flex-1 sm:max-w-64`}
        />
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls={panelId}
          className="min-h-11 rounded border border-zinc-300 px-3 py-1.5 active:bg-zinc-100 sm:hidden dark:border-zinc-700 dark:active:bg-zinc-800"
        >
          Filters{panelFilterCount > 0 ? ` (${panelFilterCount})` : ""}
        </button>
      </div>

      <div
        id={panelId}
        className={`${panelOpen ? "flex" : "hidden"} flex-wrap gap-2 sm:flex`}
      >
        <label className="sr-only" htmlFor="collection-filter-genre">
          Genre
        </label>
        <input
          id="collection-filter-genre"
          name="genre"
          defaultValue={selected.genre}
          list="collection-genre-options"
          placeholder="Genre"
          className={`${inputClass} min-w-32`}
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
          className={`${inputClass} min-w-28`}
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
          className={`${inputClass} min-w-32`}
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
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className={`${inputClass} min-w-40`}
        >
          {COLLECTION_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-11 rounded border border-zinc-300 px-3 py-1.5 active:bg-zinc-100 sm:min-h-0 dark:border-zinc-700 dark:active:bg-zinc-800"
        >
          Apply
        </button>
        {hasActiveFilters && (
          <Link
            href="/collection"
            className="flex min-h-11 items-center px-3 py-1.5 text-zinc-500 underline sm:min-h-0"
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
