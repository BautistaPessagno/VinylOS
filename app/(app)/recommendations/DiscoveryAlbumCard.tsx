import Link from "next/link";
import {
  addExploreAlbumAction,
  beginExploreAuthAction,
  openExploreAlbumAction,
  wishlistExploreAlbumAction,
} from "./actions";
import { SubmitButton } from "../SubmitButton";
import { LibraryActionForm } from "../LibraryActionForm";

const ACTION_CLASS = "-mx-1 min-h-11 px-1 underline underline-offset-2 active:opacity-70";
/** Same slot, same height, no affordance: the action no longer applies to this record. */
const IN_LIST_CLASS = "-mx-1 inline-flex min-h-11 items-center px-1 text-room-dim";

export type DiscoveryAlbum = {
  artist: string;
  title: string;
  imageUrl?: string;
  year?: string;
  editionCount?: number;
  /** Optional badge, e.g. the track that made this record a track-search match. */
  containsTrack?: string;
  /** Set when this album is already in the catalog, so it can be a plain link. */
  releaseId?: number;
};

export function DiscoveryAlbumCard({
  album,
  returnTo,
  /** When false, hide add/wishlist actions and point guests at login (public artist page). */
  signedIn = true,
  /** Explore keeps the selected guest action through login; other public cards keep one login link. */
  guestActionMode = "login-link",
  /** Already owned / already wanted, so the matching action is stated rather than offered. */
  inCollection = false,
  inWishlist = false,
}: {
  album: DiscoveryAlbum;
  returnTo: string;
  signedIn?: boolean;
  guestActionMode?: "login-link" | "pending";
  inCollection?: boolean;
  inWishlist?: boolean;
}) {
  const loginHref = `/login?next=${encodeURIComponent(returnTo)}`;
  // Already in the catalog: link straight to it, so the page is reachable by a
  // crawler and the click skips the Discogs round-trip.
  const albumHref = album.releaseId
    ? `/album/${album.releaseId}?from=${encodeURIComponent(returnTo)}`
    : null;

  const coverClassName =
    "block aspect-square w-full overflow-hidden rounded-lg bg-room-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-room-accent";
  const cover = album.imageUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={album.imageUrl}
      alt={`${album.title} de ${album.artist}`}
      width={300}
      height={300}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
    />
  );

  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-room-rule bg-room-surface p-3 transition-colors hover:border-room-dim">
      {albumHref ? (
        <Link href={albumHref} title={`Ver ${album.title}`} className={coverClassName}>
          {cover}
        </Link>
      ) : (
        <form action={openExploreAlbumAction}>
          <input type="hidden" name="artist" value={album.artist} />
          <input type="hidden" name="album" value={album.title} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" title={`Ver ${album.title}`} className={coverClassName}>
            {cover}
          </button>
        </form>
      )}

      <div className="min-w-0">
        {album.containsTrack && (
          <p
            title={`Contiene ${album.containsTrack}`}
            className="mb-1 inline-block max-w-full truncate rounded-full bg-room-accent/10 px-2 py-0.5 text-xs font-medium text-room-accent"
          >
            Contiene «{album.containsTrack}»
          </p>
        )}
        <p className="truncate font-medium">
          {albumHref ? (
            <Link href={albumHref} className="hover:text-room-accent">
              {album.title}
            </Link>
          ) : (
            album.title
          )}
        </p>
        <p className="truncate text-sm text-room-dim">{album.artist}</p>
        {(album.year || (album.editionCount ?? 0) > 1) && (
          <p className="mt-1 text-xs text-room-dim">
            {[album.year, album.editionCount && album.editionCount > 1
              ? `${album.editionCount} ediciones`
              : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {signedIn ? (
          <>
            <LibraryActionForm
              action={addExploreAlbumAction}
              fields={{ artist: album.artist, album: album.title }}
              label="Añadir"
              inListLabel="En tu colección"
              pendingText="Añadiendo…"
              inList={inCollection}
              className={ACTION_CLASS}
              inListClassName={IN_LIST_CLASS}
            />
            <LibraryActionForm
              action={wishlistExploreAlbumAction}
              fields={{ artist: album.artist, album: album.title }}
              label="Lista de deseos"
              inListLabel="En tu lista de deseos"
              pendingText="Añadiendo…"
              inList={inWishlist}
              className={ACTION_CLASS}
              inListClassName={IN_LIST_CLASS}
            />
          </>
        ) : guestActionMode === "pending" ? (
          <>
            <form action={beginExploreAuthAction}>
              <input type="hidden" name="kind" value="collection" />
              <input type="hidden" name="artist" value={album.artist} />
              <input type="hidden" name="album" value={album.title} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton pendingText="Continuando…" className={ACTION_CLASS}>
                Añadir
              </SubmitButton>
            </form>
            <form action={beginExploreAuthAction}>
              <input type="hidden" name="kind" value="wishlist" />
              <input type="hidden" name="artist" value={album.artist} />
              <input type="hidden" name="album" value={album.title} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton pendingText="Continuando…" className={ACTION_CLASS}>
                Lista de deseos
              </SubmitButton>
            </form>
          </>
        ) : (
          <Link
            href={loginHref}
            className="-mx-1 min-h-11 px-1 underline underline-offset-2 active:opacity-70"
          >
            Inicia sesión para añadir
          </Link>
        )}
        {albumHref ? (
          <Link
            href={albumHref}
            className="-mx-1 ml-auto min-h-11 px-1 text-room-dim underline underline-offset-2 active:opacity-70"
          >
            Detalles
          </Link>
        ) : (
          <form action={openExploreAlbumAction} className="ml-auto">
            <input type="hidden" name="artist" value={album.artist} />
            <input type="hidden" name="album" value={album.title} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton
              pendingText="Abriendo…"
              className="-mx-1 min-h-11 px-1 text-room-dim underline underline-offset-2 active:opacity-70"
            >
              Detalles
            </SubmitButton>
          </form>
        )}
      </div>
    </article>
  );
}
