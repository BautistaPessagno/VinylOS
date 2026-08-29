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
import { useToast } from "../../toast/ToastProvider";
import type { DiscogsAlbumGroup } from "@/lib/discogs/types";
import type { DiscogsCollectionSearchResult } from "../actions";
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
      <span className="text-room-dim">{label}</span>
      {/* 16px on mobile so iOS Safari doesn't zoom the viewport on focus. */}
      {textarea ? (
        <textarea
          name={name}
          className="rounded border border-room-rule px-3 py-2 text-base sm:text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="min-h-11 rounded border border-room-rule px-3 py-2 text-base sm:min-h-0 sm:text-sm"
        />
      )}
    </label>
  );
}

/** Same footprint as the button it replaces, minus the affordance. */
const DONE_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded border border-dashed border-room-rule px-3 py-1.5 text-sm text-room-dim sm:min-h-0";

function AlbumCard({
  album,
  pendingId,
  wishlistPendingId,
  onAdd,
  onWishlist,
  selected,
  onToggleSelect,
  added,
  wishlisted,
}: {
  album: DiscogsAlbumGroup;
  pendingId: number | null;
  wishlistPendingId: number | null;
  onAdd: (discogsReleaseId: number) => void;
  onWishlist: (discogsReleaseId: number) => void;
  selected: boolean;
  onToggleSelect: (album: DiscogsAlbumGroup) => void;
  /** Set once this search session has put the record in that list. */
  added: boolean;
  wishlisted: boolean;
}) {
  const isPicking = pendingId !== null;
  const isThisPending = pendingId === album.releaseId;
  const busy = isPicking || wishlistPendingId !== null;
  const isThisWishlistPending = wishlistPendingId === album.releaseId;

  return (
    <li
      className={`flex flex-col gap-2 rounded border p-3 text-left ${
        selected ? "border-room-accent" : "border-room-rule"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Padded label keeps the checkbox's tap target ~44px without growing the box. */}
        <label className="-m-3 flex shrink-0 cursor-pointer items-center p-3">
          <input
            type="checkbox"
            checked={selected && !added}
            onChange={() => onToggleSelect(album)}
            disabled={added}
            aria-label={`Seleccionar ${album.title}`}
            className="h-5 w-5 shrink-0 disabled:opacity-40"
          />
        </label>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-room-sunk">
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
          <span className="block text-sm text-room-dim">
            {album.artist}
          </span>
          <span className="block text-sm text-room-dim">
            {album.year}
            {album.editionCount > 1 ? ` · ${album.editionCount} ediciones` : ""}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {added ? (
            <span className={DONE_CLASS}>En tu colección</span>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(album.releaseId)}
              disabled={busy}
              className="min-h-11 rounded bg-room-accent px-3 py-1.5 text-sm text-room-on-accent active:opacity-90 disabled:opacity-50 sm:min-h-0"
            >
              {isThisPending ? "Añadiendo…" : "Añadir"}
            </button>
          )}
          {wishlisted ? (
            <span className={DONE_CLASS}>En tu lista de deseos</span>
          ) : (
            <button
              type="button"
              onClick={() => onWishlist(album.releaseId)}
              disabled={busy}
              className="min-h-11 rounded border border-room-rule px-3 py-1.5 text-sm active:bg-room-sunk disabled:opacity-50 sm:min-h-0"
            >
              {isThisWishlistPending ? "Añadiendo…" : "Lista de deseos"}
            </button>
          )}
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
  // Seeded by each search response, then extended by actions during this visit.
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const { showToast } = useToast();
  const [, startAdd] = useTransition();
  const [selected, setSelected] = useState<Map<number, DiscogsAlbumGroup>>(new Map());
  const [isBatchAdding, startBatchAdd] = useTransition();
  const resultCache = useRef(new Map<string, DiscogsCollectionSearchResult>());
  const pendingSearches = useRef(
    new Map<string, Promise<DiscogsCollectionSearchResult>>(),
  );
  const latestSearchRequestId = useRef(0);
  const normalizedQuery = normalizeSearchQuery(query);
  const queryIsReady = isSearchQueryReady(normalizedQuery);
  const selectedToAdd = [...selected.values()].filter(
    (album) => !addedIds.has(album.releaseId),
  );

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
    const releaseIds = selectedToAdd.map((album) => album.releaseId);
    startBatchAdd(async () => {
      const result = await addAlbumsFromDiscogsAction(releaseIds);
      showToast(result.toast);
      if (result.inList) {
        setAddedIds((prev) => new Set([...prev, ...releaseIds]));
        setSelected(new Map());
      }
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
          setResults(cached.albums);
          setAddedIds((prev) => new Set([...prev, ...cached.library.collection]));
          setWishlistedIds((prev) =>
            new Set([...prev, ...cached.library.wishlist]),
          );
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
            setResults(nextResults.albums);
            setAddedIds((prev) =>
              new Set([...prev, ...nextResults.library.collection]),
            );
            setWishlistedIds((prev) =>
              new Set([...prev, ...nextResults.library.wishlist]),
            );
          }
        } catch (err) {
          if (isLatestSearchRequest(requestId, latestSearchRequestId.current)) {
            setSearchError(err instanceof Error ? err.message : "La búsqueda falló");
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

  /**
   * Adding confirms in place and leaves the search results standing, so a run of
   * records can be added one after another. The toast carries the link to the
   * collection for whoever does want to go there.
   */
  function handleAdd(discogsReleaseId: number) {
    setPendingId(discogsReleaseId);
    startAdd(async () => {
      const result = await addAlbumFromDiscogsAction(discogsReleaseId);
      setPendingId(null);
      showToast(result.toast);
      if (result.inList) {
        setAddedIds((prev) => new Set(prev).add(discogsReleaseId));
        setSelected((prev) => {
          const next = new Map(prev);
          next.delete(discogsReleaseId);
          return next;
        });
      }
    });
  }

  function handleWishlist(discogsReleaseId: number) {
    setWishlistPendingId(discogsReleaseId);
    startAdd(async () => {
      const result = await addAlbumToWishlistFromDiscogsAction(discogsReleaseId);
      setWishlistPendingId(null);
      showToast(result.toast);
      if (result.inList) {
        setWishlistedIds((prev) => new Set(prev).add(discogsReleaseId));
      }
    });
  }

  if (showManualForm) {
    return (
      <form action={submitAddReleaseAction} className="flex max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowManualForm(false)}
          className="min-h-11 self-start text-sm text-room-dim underline active:opacity-70"
        >
          ← Volver a la búsqueda
        </button>

        <Field label="Título" name="title" required />
        <Field label="Artista(s), separados por comas" name="artistNames" required />
        <Field label="Año" name="year" type="number" />
        <Field label="País" name="country" />
        <Field label="Sello" name="labelName" />
        <Field label="Nº de catálogo" name="catalogNumber" />
        <Field label="Géneros, separados por comas" name="genres" />
        <Field label="Estilos, separados por comas" name="styles" />

        <hr className="my-2 border-room-rule" />

        <Field label="Carpeta" name="folder" />
        <Field label="Valoración (1-5)" name="rating" type="number" />
        <Field label="Estado del disco" name="mediaCondition" />
        <Field label="Estado de la funda" name="sleeveCondition" />
        <Field label="Precio de compra" name="purchasePrice" type="number" />
        <Field label="Fecha de compra" name="purchaseDate" type="date" />
        <Field label="Lugar de compra" name="purchaseLocation" />
        <Field label="Notas" name="notes" textarea />

        <SubmitButton
          pendingText="Añadiendo…"
          className="mt-2 min-h-11 self-start rounded bg-room-accent px-4 py-2 text-room-on-accent active:opacity-90"
        >
          Añadir a la colección
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
            placeholder="Busca un álbum (solo vinilo)..."
            className="min-h-11 w-full rounded border border-room-rule px-3 py-2 text-base sm:text-sm"
          />
          {isSearching && queryIsReady && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-room-dim">
              Buscando…
            </span>
          )}
        </div>
        {normalizedQuery.length > 0 && !queryIsReady && (
          <p className="text-center text-sm text-room-dim">
            Escribe al menos 2 caracteres
          </p>
        )}
        {searchError && <p className="text-center text-sm text-room-danger">{searchError}</p>}
        {results.length > 0 && (
          <p className="text-center text-sm text-room-dim">
            ¿Nuevo en VinylOS? Selecciona varios álbumes abajo y añádelos todos de una vez.
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          className="min-h-11 self-center px-2 text-sm text-room-dim underline active:opacity-70"
        >
          ¿No lo encuentras? Introdúcelo manualmente
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
              selected={selected.has(album.releaseId) && !addedIds.has(album.releaseId)}
              onToggleSelect={toggleSelect}
              added={addedIds.has(album.releaseId)}
              wishlisted={wishlistedIds.has(album.releaseId)}
            />
          ))}
        </ul>
      </div>

      {selectedToAdd.length > 0 && (
        // Sticky offset clears the mobile bottom tab bar and the iOS home indicator.
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex w-full max-w-2xl items-center justify-between rounded-lg border border-room-rule bg-room-surface px-4 py-3 shadow-lg sm:bottom-4">
          <span className="text-sm font-medium">
            {selectedToAdd.length} seleccionados
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="min-h-11 px-2 text-sm text-room-dim underline active:opacity-70 sm:min-h-0"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={isBatchAdding}
              className="min-h-11 rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent active:opacity-90 disabled:opacity-50 sm:min-h-0"
            >
              {isBatchAdding
                ? "Añadiendo…"
                : `Añadir ${selectedToAdd.length} disco${selectedToAdd.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
