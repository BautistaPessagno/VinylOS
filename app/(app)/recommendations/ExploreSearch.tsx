"use client";

import {
  ViewTransition,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { VinylSpinner } from "@/app/(app)/VinylSpinner";
import {
  isLatestSearchRequest,
  isSearchQueryReady,
  MAX_SEARCH_QUERY_LENGTH,
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
const SEARCH_RETURN_PATH = "/explore?focus=search";

export function ExploreSearch({
  focusOnMount,
  initialQuery = "",
  signedIn = true,
  children,
}: {
  focusOnMount: boolean;
  /** Seeded from `?q=` so a search started on the landing page continues here. */
  initialQuery?: string;
  signedIn?: boolean;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
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
          Busca discos, artistas y canciones
        </label>
        {/* Shares a name with the landing page's field so the two morph. */}
        <ViewTransition name="vinyl-search" share="vinyl-search">
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-room-dim"
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
              maxLength={MAX_SEARCH_QUERY_LENGTH}
              placeholder="Busca artistas, discos y canciones"
              autoComplete="off"
              className="w-full rounded-2xl border border-room-rule bg-room-surface py-3.5 pl-12 pr-28 text-base shadow-sm outline-none transition focus:border-room-accent focus:ring-2 focus:ring-room-accent/20"
            />
            {isSearching && queryIsReady && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <VinylSpinner size="sm" label="Buscando" />
              </span>
            )}
          </div>
        </ViewTransition>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {normalizedQuery.length > 0 && !queryIsReady && (
          <p className="text-center text-sm text-room-dim">Escribe al menos 2 caracteres</p>
        )}
        {error && <p className="text-center text-sm text-room-danger">{error}</p>}
        {result && result.query === normalizedQuery && !isSearching && !error && (
          <p className="sr-only">
            Se encontraron {result.artists.length} artistas, {result.albums.length} discos y{" "}
            {result.songs.length} canciones
          </p>
        )}
      </div>

      {normalizedQuery.length === 0 ? (
        children
      ) : result && result.query === normalizedQuery ? (
        <div className="flex flex-col gap-4">
          {result.albums.length > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <label htmlFor="explore-sort" className="text-room-dim">
                Ordenar discos
              </label>
              <select
                id="explore-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as AlbumSortKey)}
                className="rounded border border-room-rule px-2 py-1.5"
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
            signedIn={signedIn}
          />
        </div>
      ) : (
        queryIsReady && !error && <SearchResultsSkeleton />
      )}
    </div>
  );
}

/**
 * Held while a ready query is still in flight — including the first render
 * after arriving from the landing page with `?q=`, which would otherwise morph
 * the search bar onto an empty page.
 */
function SearchResultsSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="sheen aspect-square w-full rounded" />
          <div className="sheen h-4 w-3/4 rounded" />
          <div className="sheen h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}
