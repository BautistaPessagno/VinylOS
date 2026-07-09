"use client";

import { useEffect, useState, useTransition } from "react";
import { searchDiscogsAction, addAlbumFromDiscogsAction, submitAddReleaseAction } from "../actions";
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
}: {
  album: DiscogsAlbumGroup;
  pendingId: number | null;
  onAdd: (discogsReleaseId: number) => void;
}) {
  const isPicking = pendingId !== null;
  const isThisPending = pendingId === album.releaseId;

  return (
    <li className="flex flex-col gap-2 rounded border border-zinc-200 p-3 text-left">
      <div className="flex items-center gap-3">
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

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSearchError(null);
    }
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
        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          className="self-center text-sm text-zinc-600 underline"
        >
          Can&apos;t find it? Enter manually
        </button>
        <ul className="flex flex-col gap-2">
          {results.map((album) => (
            <AlbumCard key={album.key} album={album} pendingId={pendingId} onAdd={handleAdd} />
          ))}
        </ul>
      </div>
    </div>
  );
}
