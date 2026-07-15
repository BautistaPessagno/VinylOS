"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  isLatestSearchRequest,
  isSearchQueryReady,
  normalizeSearchQuery,
  searchErrorMessage,
} from "@/lib/search/searchQuery";
import {
  ALBUM_SORT_OPTIONS,
  sortAlbumGroups,
  type AlbumSortKey,
} from "@/lib/search/sortAlbums";
import { searchExploreAction, type ExploreSearchResult } from "./actions";
import { ExploreSearchResults } from "./ExploreSearchResults";

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_RETURN_PATH = "/recommendations?tab=explore&focus=search";

export function ExploreSearch({
  focusOnMount,
  children,
}: {
  focusOnMount: boolean;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ExploreSearchResult | null>(null);
  const [sort, setSort] = useState<AlbumSortKey>("relevance");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const resultCache = useRef(new Map<string, ExploreSearchResult>());
  const pendingSearches = useRef(
    new Map<string, Promise<ExploreSearchResult>>(),
  );
  const latestSearchRequestId = useRef(0);
  const normalizedQuery = normalizeSearchQuery(query);
  const queryIsReady = isSearchQueryReady(normalizedQuery);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  function handleQueryChange(value: string) {
    const nextNormalizedQuery = normalizeSearchQuery(value);
    setQuery(value);
    setError(null);
    if (result && result.query !== nextNormalizedQuery) setResult(null);
    if (!isSearchQueryReady(nextNormalizedQuery)) {
      latestSearchRequestId.current += 1;
    }
  }

  useEffect(() => {
    const requestId = ++latestSearchRequestId.current;
    if (!isSearchQueryReady(normalizedQuery)) return;

    const timeout = setTimeout(() => {
      const cached = resultCache.current.get(normalizedQuery);
      if (cached) {
        if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
          setResult(cached);
        }
        return;
      }

      startSearch(async () => {
        let pending = pendingSearches.current.get(normalizedQuery);
        if (!pending) {
          pending = searchExploreAction(normalizedQuery);
          pendingSearches.current.set(normalizedQuery, pending);
        }

        try {
          const nextResult = await pending;
          resultCache.current.set(normalizedQuery, nextResult);
          if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
            setResult(nextResult);
          }
        } catch (caught) {
          if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
            setError(searchErrorMessage(caught));
          }
        } finally {
          if (pendingSearches.current.get(normalizedQuery) === pending) {
            pendingSearches.current.delete(normalizedQuery);
          }
        }
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [normalizedQuery]);

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-3xl">
        <label htmlFor="explore-search" className="sr-only">
          Search records, artists, and songs
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            ref={inputRef}
            id="explore-search"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search artists, records, and songs"
            autoComplete="off"
            className="w-full rounded-2xl border border-zinc-300 bg-white py-3.5 pl-12 pr-28 text-base shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-950"
          />
          {isSearching && queryIsReady && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              Searching…
            </span>
          )}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {normalizedQuery.length > 0 && !queryIsReady && (
          <p className="text-center text-sm text-zinc-500">Enter at least 2 characters</p>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {result && result.query === normalizedQuery && !isSearching && !error && (
          <p className="sr-only">
            Found {result.artists.length} artists, {result.albums.length} records, and{" "}
            {result.songs.length} songs
          </p>
        )}
      </div>

      {normalizedQuery.length === 0
        ? children
        : result &&
          result.query === normalizedQuery && (
            <div className="flex flex-col gap-4">
              {result.albums.length > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                  <label htmlFor="explore-sort" className="text-zinc-500">
                    Sort records
                  </label>
                  <select
                    id="explore-sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as AlbumSortKey)}
                    className="rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {ALBUM_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <ExploreSearchResults
                result={{ ...result, albums: sortAlbumGroups(result.albums, sort) }}
                returnTo={SEARCH_RETURN_PATH}
              />
            </div>
          )}
    </div>
  );
}
