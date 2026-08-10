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
  label = "Elegir una edición concreta",
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
          setError(err instanceof Error ? err.message : "No se pudieron cargar las ediciones");
        }
      });
    }
  }

  const isPicking = pendingId !== null && pendingId !== undefined;

  return (
    <div className="text-sm">
      <button type="button" onClick={toggle} className="text-room-dim underline">
        {open ? "Ocultar ediciones ▴" : `${label} ▾`}
      </button>
      {open && (
        <div className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
          {isLoading && <p className="text-room-dim">Cargando ediciones…</p>}
          {error && <p className="text-room-danger">{error}</p>}
          {versions?.length === 0 && (
            <p className="text-room-dim">No se encontraron otras ediciones en vinilo.</p>
          )}
          {versions?.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPick(v.id)}
              disabled={isPicking}
              className="flex items-center justify-between rounded border border-room-rule px-3 py-2 text-left hover:bg-room-sunk disabled:opacity-50"
            >
              <span>
                {v.released || "Año desconocido"}
                {v.label ? ` · ${v.label}` : ""}
                {v.catno ? ` (${v.catno})` : ""}
                {v.country ? ` · ${v.country}` : ""}
              </span>
              {pendingId === v.id && <span className="text-room-dim">Añadiendo…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
