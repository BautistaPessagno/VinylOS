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
  "min-h-11 rounded border border-room-rule px-3 py-1.5 sm:min-h-0";

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
          Busca en tu colección
        </label>
        <input
          id="collection-search"
          name="q"
          type="search"
          enterKeyHint="search"
          defaultValue={selected.q}
          placeholder="Buscar título o artista"
          className={`${inputClass} min-w-0 flex-1 sm:max-w-64`}
        />
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls={panelId}
          className="min-h-11 rounded border border-room-rule px-3 py-1.5 active:bg-room-sunk sm:hidden"
        >
          Filtros{panelFilterCount > 0 ? ` (${panelFilterCount})` : ""}
        </button>
      </div>

      <div
        id={panelId}
        className={`${panelOpen ? "flex" : "hidden"} flex-wrap gap-2 sm:flex`}
      >
        <label className="sr-only" htmlFor="collection-filter-genre">
          Género
        </label>
        <input
          id="collection-filter-genre"
          name="genre"
          defaultValue={selected.genre}
          list="collection-genre-options"
          placeholder="Género"
          className={`${inputClass} min-w-32`}
        />
        <datalist id="collection-genre-options">
          {options.genres.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>

        <label className="sr-only" htmlFor="collection-filter-year">
          Año
        </label>
        <input
          id="collection-filter-year"
          name="year"
          defaultValue={selected.year}
          list="collection-year-options"
          placeholder="Año"
          type="number"
          className={`${inputClass} min-w-28`}
        />
        <datalist id="collection-year-options">
          {options.years.map((year) => (
            <option key={year} value={String(year)} />
          ))}
        </datalist>

        <label className="sr-only" htmlFor="collection-filter-label">
          Sello
        </label>
        <input
          id="collection-filter-label"
          name="label"
          defaultValue={selected.label}
          list="collection-label-options"
          placeholder="Sello"
          className={`${inputClass} min-w-32`}
        />
        <datalist id="collection-label-options">
          {options.labels.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>

        <label className="sr-only" htmlFor="collection-sort">
          Ordenar por
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
              Orden: {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-11 rounded border border-room-rule px-3 py-1.5 active:bg-room-sunk sm:min-h-0"
        >
          Aplicar
        </button>
        {hasActiveFilters && (
          <Link
            href="/collection"
            className="flex min-h-11 items-center px-3 py-1.5 text-room-dim underline sm:min-h-0"
          >
            Borrar filtros
          </Link>
        )}
      </div>
    </form>
  );
}
