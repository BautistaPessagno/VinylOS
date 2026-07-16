"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchDiscogsAction,
  addAlbumFromDiscogsAction,
  addAlbumsFromDiscogsAction,
  submitAddReleaseAction,
} from "../actions";
import { addAlbumToWishlistFromDiscogsAction } from "../../wishlist/actions";
import { EditionPicker } from "../EditionPicker";
import { SubmitButton } from "../../SubmitButton";
import type { DiscogsAlbumGroup } from "@/lib/discogs/types";
import {
  isLatestSearchRequest,
  isSearchQueryReady,
  normalizeSearchQuery,
} from "@/lib/search/searchQuery";

const SEARCH_DEBOUNCE_MS = 400;

function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      {/* 16px on mobile so iOS Safari doesn't zoom the viewport on focus. */}
      {textarea ? (
        <textarea
          name={name}
          className="rounded border border-zinc-300 px-3 py-2 text-base sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-base sm:min-h-0 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      )}
    </label>
  );
}

function AlbumCard({
  album,
  pendingId,
  wishlistPendingId,
  onAdd,
  onWishlist,
  selected,
  onToggleSelect,
}: {
  album: DiscogsAlbumGroup;
  pendingId: number | null;
  wishlistPendingId: number | null;
  onAdd: (discogsReleaseId: number) => void;
  onWishlist: (discogsReleaseId: number) => void;
  selected: boolean;
  onToggleSelect: (album: DiscogsAlbumGroup) => void;
}) {
  const isPicking = pendingId !== null;
  const isThisPending = pendingId === album.releaseId;
  const busy = isPicking || wishlistPendingId !== null;
  const isThisWishlistPending = wishlistPendingId === album.releaseId;

  return (
    <li
      className={`flex flex-col gap-2 rounded border p-3 text-left ${
        selected ? "border-black dark:border-white" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Padded label keeps the checkbox's tap target ~44px without growing the box. */}
        <label className="-m-3 flex shrink-0 cursor-pointer items-center p-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(album)}
            aria-label={`Select ${album.title}`}
            className="h-5 w-5 shrink-0"
          />
        </label>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          {album.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.coverImage}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex-1">
          <span className="block font-medium">{album.title}</span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">
            {album.artist}
          </span>
          <span className="block text-sm text-zinc-500">
            {album.year}
            {album.editionCount > 1 ? ` · ${album.editionCount} editions` : ""}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => onAdd(album.releaseId)}
            disabled={busy}
            className="min-h-11 rounded bg-black px-3 py-1.5 text-sm text-white active:bg-zinc-800 disabled:opacity-50 sm:min-h-0 dark:bg-white dark:text-black dark:active:bg-zinc-200"
          >
            {isThisPending ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => onWishlist(album.releaseId)}
            disabled={busy}
            className="min-h-11 rounded border border-zinc-300 px-3 py-1.5 text-sm active:bg-zinc-100 disabled:opacity-50 sm:min-h-0 dark:border-zinc-600 dark:active:bg-zinc-800"
          >
            {isThisWishlistPending ? "Adding…" : "Wishlist"}
          </button>
        </div>
      </div>
      {album.masterId && (
        <EditionPicker masterId={album.masterId} onPick={onAdd} pendingId={pendingId} />
      )}
    </li>
  );
}

export function AddReleaseForm() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscogsAlbumGroup[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [wishlistPendingId, setWishlistPendingId] = useState<number | null>(null);
  const [, startAdd] = useTransition();
  const [selected, setSelected] = useState<Map<number, DiscogsAlbumGroup>>(new Map());
  const [isBatchAdding, startBatchAdd] = useTransition();
  const resultCache = useRef(new Map<string, DiscogsAlbumGroup[]>());
  const pendingSearches = useRef(
    new Map<string, Promise<DiscogsAlbumGroup[]>>(),
  );
  const latestSearchRequestId = useRef(0);
  const normalizedQuery = normalizeSearchQuery(query);
  const queryIsReady = isSearchQueryReady(normalizedQuery);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!isSearchQueryReady(value)) {
      latestSearchRequestId.current += 1;
      setResults([]);
      setSearchError(null);
    }
  }

  function toggleSelect(album: DiscogsAlbumGroup) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(album.releaseId)) {
        next.delete(album.releaseId);
      } else {
        next.set(album.releaseId, album);
      }
      return next;
    });
  }

  function handleAddSelected() {
    startBatchAdd(async () => {
      await addAlbumsFromDiscogsAction([...selected.keys()]);
    });
  }

  useEffect(() => {
    const requestId = ++latestSearchRequestId.current;
    if (!isSearchQueryReady(normalizedQuery)) {
      return;
    }

    const timeout = setTimeout(() => {
      setSearchError(null);
      const cached = resultCache.current.get(normalizedQuery);
      if (cached) {
        if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
          setResults(cached);
        }
        return;
      }

      startSearch(async () => {
        let pending = pendingSearches.current.get(normalizedQuery);
        if (!pending) {
          pending = searchDiscogsAction(normalizedQuery);
          pendingSearches.current.set(normalizedQuery, pending);
        }

        try {
          const nextResults = await pending;
          resultCache.current.set(normalizedQuery, nextResults);
          if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
            setResults(nextResults);
          }
        } catch (err) {
          if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
            setSearchError(err instanceof Error ? err.message : "Search failed");
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

  // Auto-focus pops the keyboard and can scroll-jump on mobile, so desktop only.
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) {
      searchInputRef.current?.focus();
    }
  }, []);

  function handleAdd(discogsReleaseId: number) {
    setPendingId(discogsReleaseId);
    startAdd(async () => {
      // addAlbumFromDiscogsAction redirects to /collection on success; if it throws
      // (rare network/API failure), we don't swallow it here so the redirect isn't
      // masked — the nearest error boundary handles that case.
      await addAlbumFromDiscogsAction(discogsReleaseId);
    });
  }

  function handleWishlist(discogsReleaseId: number) {
    setWishlistPendingId(discogsReleaseId);
    startAdd(async () => {
      // Redirects to /wishlist on success (same throw behavior as handleAdd).
      await addAlbumToWishlistFromDiscogsAction(discogsReleaseId);
    });
  }

  if (showManualForm) {
    return (
      <form action={submitAddReleaseAction} className="flex max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowManualForm(false)}
          className="min-h-11 self-start text-sm text-zinc-600 underline active:opacity-70 dark:text-zinc-300"
        >
          ← Back to search
        </button>

        <Field label="Title" name="title" required />
        <Field label="Artist(s), comma separated" name="artistNames" required />
        <Field label="Year" name="year" type="number" />
        <Field label="Country" name="country" />
        <Field label="Label" name="labelName" />
        <Field label="Catalog #" name="catalogNumber" />
        <Field label="Genres, comma separated" name="genres" />
        <Field label="Styles, comma separated" name="styles" />

        <hr className="my-2 border-zinc-200 dark:border-zinc-800" />

        <Field label="Folder" name="folder" />
        <Field label="Rating (1-5)" name="rating" type="number" />
        <Field label="Media condition" name="mediaCondition" />
        <Field label="Sleeve condition" name="sleeveCondition" />
        <Field label="Purchase price" name="purchasePrice" type="number" />
        <Field label="Purchase date" name="purchaseDate" type="date" />
        <Field label="Purchase location" name="purchaseLocation" />
        <Field label="Notes" name="notes" textarea />

        <SubmitButton
          pendingText="Adding…"
          className="mt-2 min-h-11 self-start rounded bg-black px-4 py-2 text-white active:bg-zinc-800 dark:bg-white dark:text-black dark:active:bg-zinc-200"
        >
          Add to collection
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search for an album (vinyl only)..."
            className="min-h-11 w-full rounded border border-zinc-300 px-3 py-2 text-base sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {isSearching && queryIsReady && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              Searching…
            </span>
          )}
        </div>
        {normalizedQuery.length > 0 && !queryIsReady && (
          <p className="text-center text-sm text-zinc-500">
            Enter at least 2 characters
          </p>
        )}
        {searchError && <p className="text-center text-sm text-red-600">{searchError}</p>}
        {results.length > 0 && (
          <p className="text-center text-sm text-zinc-500">
            New to VinylOS? Select multiple albums below and add them all at once.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          className="min-h-11 self-center px-2 text-sm text-zinc-600 underline active:opacity-70 dark:text-zinc-300"
        >
          Can&apos;t find it? Enter manually
        </button>
        <ul className="flex flex-col gap-2 pb-4">
          {results.map((album) => (
            <AlbumCard
              key={album.key}
              album={album}
              pendingId={pendingId}
              wishlistPendingId={wishlistPendingId}
              onAdd={handleAdd}
              onWishlist={handleWishlist}
              selected={selected.has(album.releaseId)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </ul>
      </div>

      {selected.size > 0 && (
        // Sticky offset clears the mobile bottom tab bar and the iOS home indicator.
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex w-full max-w-2xl items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg sm:bottom-4 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="min-h-11 px-2 text-sm text-zinc-600 underline active:opacity-70 sm:min-h-0 dark:text-zinc-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={isBatchAdding}
              className="min-h-11 rounded bg-black px-4 py-2 text-sm text-white active:bg-zinc-800 disabled:opacity-50 sm:min-h-0 dark:bg-white dark:text-black dark:active:bg-zinc-200"
            >
              {isBatchAdding ? "Adding…" : `Add ${selected.size} record${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
