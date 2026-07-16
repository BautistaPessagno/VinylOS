import {
  addExploreAlbumAction,
  openExploreAlbumAction,
  wishlistExploreAlbumAction,
} from "./actions";
import { SubmitButton } from "../SubmitButton";

export type DiscoveryAlbum = {
  artist: string;
  title: string;
  imageUrl?: string;
  year?: string;
  editionCount?: number;
  /** Optional badge, e.g. the track that made this record a track-search match. */
  containsTrack?: string;
};

export function DiscoveryAlbumCard({
  album,
  returnTo,
}: {
  album: DiscoveryAlbum;
  returnTo: string;
}) {
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600">
      <form action={openExploreAlbumAction}>
        <input type="hidden" name="artist" value={album.artist} />
        <input type="hidden" name="album" value={album.title} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          title={`View ${album.title}`}
          className="block aspect-square w-full overflow-hidden rounded-lg bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:bg-zinc-800"
        >
          {album.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.imageUrl}
              alt={`${album.title} by ${album.artist}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
            />
          )}
        </button>
      </form>

      <div className="min-w-0">
        {album.containsTrack && (
          <p
            title={`Contains ${album.containsTrack}`}
            className="mb-1 inline-block max-w-full truncate rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            Contains “{album.containsTrack}”
          </p>
        )}
        <p className="truncate font-medium">{album.title}</p>
        <p className="truncate text-sm text-zinc-500">{album.artist}</p>
        {(album.year || (album.editionCount ?? 0) > 1) && (
          <p className="mt-1 text-xs text-zinc-400">
            {[album.year, album.editionCount && album.editionCount > 1
              ? `${album.editionCount} editions`
              : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <form action={addExploreAlbumAction}>
          <input type="hidden" name="artist" value={album.artist} />
          <input type="hidden" name="album" value={album.title} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton
            pendingText="Adding…"
            className="-mx-1 min-h-11 px-1 underline underline-offset-2 active:opacity-70"
          >
            Add
          </SubmitButton>
        </form>
        <form action={wishlistExploreAlbumAction}>
          <input type="hidden" name="artist" value={album.artist} />
          <input type="hidden" name="album" value={album.title} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton
            pendingText="Adding…"
            className="-mx-1 min-h-11 px-1 underline underline-offset-2 active:opacity-70"
          >
            Wishlist
          </SubmitButton>
        </form>
        <form action={openExploreAlbumAction} className="ml-auto">
          <input type="hidden" name="artist" value={album.artist} />
          <input type="hidden" name="album" value={album.title} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton
            pendingText="Opening…"
            className="-mx-1 min-h-11 px-1 text-zinc-500 underline underline-offset-2 active:opacity-70"
          >
            Details
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}
