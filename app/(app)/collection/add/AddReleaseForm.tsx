"use client";

import { useEffect, useState, useTransition } from "react";
import {
  searchDiscogsAction,
  getDiscogsReleaseDetailAction,
  submitAddReleaseAction,
} from "../actions";
import type { DiscogsSearchResult } from "@/lib/discogs/types";

const SEARCH_DEBOUNCE_MS = 400;

type Prefill = {
  discogsReleaseId?: number;
  title?: string;
  artistNames?: string;
  year?: string;
  country?: string;
  labelName?: string;
  catalogNumber?: string;
  genres?: string;
  styles?: string;
  coverUrl?: string;
  thumbUrl?: string;
  artistBio?: string;
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      )}
    </label>
  );
}

export function AddReleaseForm() {
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscogsSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setError(null);
    }
  }

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      setError(null);
      startTransition(async () => {
        try {
          setResults(await searchDiscogsAction(query));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(result: DiscogsSearchResult) {
    setError(null);
    startTransition(async () => {
      try {
        const { detail, artistBio } = await getDiscogsReleaseDetailAction(result.id);
        setPrefill({
          discogsReleaseId: detail.id,
          title: detail.title,
          artistNames: detail.artists?.map((a) => a.name).join(", ") ?? "",
          year: detail.year?.toString() ?? "",
          country: detail.country ?? "",
          labelName: detail.labels?.[0]?.name ?? "",
          catalogNumber: detail.labels?.[0]?.catno ?? "",
          genres: detail.genres?.join(", ") ?? "",
          styles: detail.styles?.join(", ") ?? "",
          coverUrl: detail.images?.[0]?.uri ?? "",
          thumbUrl: detail.images?.[0]?.uri ?? "",
          artistBio: artistBio?.bio?.summary,
        });
        setShowForm(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load release");
      }
    });
  }

  if (!showForm) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search Discogs by title or artist..."
              className="w-full rounded border border-zinc-300 px-3 py-2 text-center"
              autoFocus
            />
            {isPending && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                Searching…
              </span>
            )}
          </div>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => {
              setPrefill({});
              setShowForm(true);
            }}
            className="self-center text-sm text-zinc-600 underline"
          >
            Can&apos;t find it? Enter manually
          </button>
          <ul className="flex flex-col gap-2">
            {results.map((r) => {
            const image = r.cover_image || r.thumb;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-3 rounded border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-100">
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span>
                    <span className="block font-medium">{r.title}</span>
                    <span className="block text-sm text-zinc-500">
                      {r.year} {r.format?.length ? `· ${r.format.join(", ")}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <form action={submitAddReleaseAction} className="flex max-w-2xl flex-col gap-4">
      {prefill.discogsReleaseId && (
        <input type="hidden" name="discogsReleaseId" value={prefill.discogsReleaseId} />
      )}
      <input type="hidden" name="coverUrl" value={prefill.coverUrl ?? ""} />
      <input type="hidden" name="thumbUrl" value={prefill.thumbUrl ?? ""} />

      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="self-start text-sm text-zinc-600 underline"
      >
        ← Back to search
      </button>

      {prefill.coverUrl && (
        <div className="h-40 w-40 overflow-hidden rounded bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={prefill.coverUrl}
            alt={prefill.title ?? "Album cover"}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <Field label="Title" name="title" defaultValue={prefill.title} required />
      <Field
        label="Artist(s), comma separated"
        name="artistNames"
        defaultValue={prefill.artistNames}
        required
      />
      <Field label="Year" name="year" type="number" defaultValue={prefill.year} />
      <Field label="Country" name="country" defaultValue={prefill.country} />
      <Field label="Label" name="labelName" defaultValue={prefill.labelName} />
      <Field label="Catalog #" name="catalogNumber" defaultValue={prefill.catalogNumber} />
      <Field label="Genres, comma separated" name="genres" defaultValue={prefill.genres} />
      <Field label="Styles, comma separated" name="styles" defaultValue={prefill.styles} />

      {prefill.artistBio && (
        <p className="line-clamp-3 text-sm text-zinc-500">{prefill.artistBio}</p>
      )}

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
