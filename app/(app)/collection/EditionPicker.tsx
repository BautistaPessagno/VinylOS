"use client";

import { useState, useTransition } from "react";
import { getAlbumEditionsAction } from "./actions";
import type { DiscogsMasterVersion } from "@/lib/discogs/types";

/**
 * Opt-in "advanced" control for picking a specific vinyl pressing of an album,
 * shared between the add flow (one-click add uses the top match by default) and
 * the edit flow (swap an owned item to a different pressing).
 */
export function EditionPicker({
  masterId,
  onPick,
  pendingId,
  label = "Choose specific edition",
}: {
  masterId: number;
  onPick: (discogsReleaseId: number) => void;
  pendingId?: number | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<DiscogsMasterVersion[] | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && versions === null) {
      setError(null);
      startLoad(async () => {
        try {
          setVersions(await getAlbumEditionsAction(masterId));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load editions");
        }
      });
    }
  }

  const isPicking = pendingId !== null && pendingId !== undefined;

  return (
    <div className="text-sm">
      <button type="button" onClick={toggle} className="text-zinc-600 underline">
        {open ? "Hide editions ▴" : `${label} ▾`}
      </button>
      {open && (
        <div className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
          {isLoading && <p className="text-zinc-400">Loading editions…</p>}
          {error && <p className="text-red-600">{error}</p>}
          {versions?.length === 0 && (
            <p className="text-zinc-400">No other vinyl editions found.</p>
          )}
          {versions?.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPick(v.id)}
              disabled={isPicking}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <span>
                {v.released || "Year unknown"}
                {v.label ? ` · ${v.label}` : ""}
                {v.catno ? ` (${v.catno})` : ""}
                {v.country ? ` · ${v.country}` : ""}
              </span>
              {pendingId === v.id && <span className="text-zinc-400">Adding…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
