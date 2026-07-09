"use client";

import { useEffect, useState, useTransition } from "react";
import {
  searchDiscogsAction,
  addAlbumFromDiscogsAction,
  addAlbumsFromDiscogsAction,
  submitAddReleaseAction,
} from "../actions";
import { EditionPicker } from "../EditionPicker";
import type { DiscogsAlbumGroup } from "@/lib/discogs/types";

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
      <span className="text-zinc-600">{label}</span>
      {textarea ? (
        <textarea name={name} className="rounded border border-zinc-300 px-3 py-2" />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      )}
    </label>
  );
}

function AlbumCard({
  album,
  pendingId,
  onAdd,
  selected,
  onToggleSelect,
}: {
  album: DiscogsAlbumGroup;
  pendingId: number | null;
  onAdd: (discogsReleaseId: number) => void;
  selected: boolean;
  onToggleSelect: (album: DiscogsAlbumGroup) => void;
}) {
  const isPicking = pendingId !== null;
  const isThisPending = pendingId === album.releaseId;

  return (
    <li
      className={`flex flex-col gap-2 rounded border p-3 text-left ${
        selected ? "border-black dark:border-white" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(album)}
          aria-label={`Select ${album.title}`}
          className="h-4 w-4 shrink-0"
        />
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-100">
          {album.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.coverImage} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex-1">
          <span className="block font-medium">{album.title}</span>
          <span className="block text-sm text-zinc-500">
            {album.year}
            {album.editionCount > 1 ? ` · ${album.editionCount} editions` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(album.releaseId)}
          disabled={isPicking}
          className="shrink-0 rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {isThisPending ? "Adding…" : "Add"}
        </button>
      </div>
      {album.masterId && (
        <EditionPicker masterId={album.masterId} onPick={onAdd} pendingId={pendingId} />
      )}
    </li>
  );
}

export function AddReleaseForm() {
  const [showManualForm, setShowManualForm] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscogsAlbumGroup[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startAdd] = useTransition();
  const [selected, setSelected] = useState<Map<number, DiscogsAlbumGroup>>(new Map());
  const [isBatchAdding, startBatchAdd] = useTransition();

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
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
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      setSearchError(null);
      startSearch(async () => {
        try {
          setResults(await searchDiscogsAction(query));
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : "Search failed");
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleAdd(discogsReleaseId: number) {
    setPendingId(discogsReleaseId);
    startAdd(async () => {
      // addAlbumFromDiscogsAction redirects to /collection on success; if it throws
      // (rare network/API failure), we don't swallow it here so the redirect isn't
      // masked — the nearest error boundary handles that case.
      await addAlbumFromDiscogsAction(discogsReleaseId);
    });
  }

  if (showManualForm) {
    return (
      <form action={submitAddReleaseAction} className="flex max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowManualForm(false)}
          className="self-start text-sm text-zinc-600 underline"
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

        <hr className="my-2 border-zinc-200" />

        <Field label="Folder" name="folder" />
        <Field label="Rating (1-5)" name="rating" type="number" />
        <Field label="Media condition" name="mediaCondition" />
        <Field label="Sleeve condition" name="sleeveCondition" />
        <Field label="Purchase price" name="purchasePrice" type="number" />
        <Field label="Purchase date" name="purchaseDate" type="date" />
        <Field label="Purchase location" name="purchaseLocation" />
        <Field label="Notes" name="notes" textarea />

        <button type="submit" className="mt-2 self-start rounded bg-black px-4 py-2 text-white">
          Add to collection
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search for an album (vinyl only)..."
            className="w-full rounded border border-zinc-300 px-3 py-2 text-center"
            autoFocus
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
              Searching…
            </span>
          )}
        </div>
        {searchError && <p className="text-center text-sm text-red-600">{searchError}</p>}
        {results.length > 0 && (
          <p className="text-center text-sm text-zinc-500">
            New to VinylOS? Select multiple albums below and add them all at once.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          className="self-center text-sm text-zinc-600 underline"
        >
          Can&apos;t find it? Enter manually
        </button>
        <ul className="flex flex-col gap-2 pb-4">
          {results.map((album) => (
            <AlbumCard
              key={album.key}
              album={album}
              pendingId={pendingId}
              onAdd={handleAdd}
              selected={selected.has(album.releaseId)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </ul>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 flex w-full max-w-2xl items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="text-sm text-zinc-600 underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={isBatchAdding}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isBatchAdding ? "Adding…" : `Add ${selected.size} record${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
