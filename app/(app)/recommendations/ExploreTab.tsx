import Link from "next/link";
import { listExploreGenres, listExploreAlbums } from "@/lib/services/exploreService";
import {
  addExploreAlbumAction,
  wishlistExploreAlbumAction,
  openExploreAlbumAction,
} from "./actions";

/**
 * Discovery tab: browse top albums by genre (Last.fm charts), independent of what the
 * user owns. Cards render straight from Last.fm data; a Discogs release is resolved only
 * when the user acts on a card (Add / Wishlist / Details).
 */
export async function ExploreTab({ genre }: { genre?: string }) {
  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : genres[0];
  const albums = await listExploreAlbums(selected);
  const returnTo = `/recommendations?tab=explore&genre=${encodeURIComponent(selected)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => {
          const isActive = g === selected;
          return (
            <Link
              key={g}
              href={`/recommendations?tab=explore&genre=${encodeURIComponent(g)}`}
              className={
                isActive
                  ? "rounded-full bg-red-500 px-3 py-1 text-sm font-medium capitalize text-white"
                  : "rounded-full border border-zinc-200 px-3 py-1 text-sm capitalize text-zinc-600 hover:border-red-500 hover:text-red-500 dark:border-zinc-700"
              }
            >
              {g}
            </Link>
          );
        })}
      </div>

      {albums.length === 0 ? (
        <p className="text-center text-zinc-500">
          Couldn&apos;t load albums for this genre right now. Try another.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((album) => (
            <div
              key={`${album.artist}::${album.album}`}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <form action={openExploreAlbumAction}>
                <input type="hidden" name="artist" value={album.artist} />
                <input type="hidden" name="album" value={album.album} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  title="View album details"
                  className="block aspect-square w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800"
                >
                  {album.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.imageUrl}
                      alt={album.album}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              </form>
              <div className="flex flex-col">
                <span className="truncate font-medium">{album.album}</span>
                <span className="truncate text-sm text-zinc-500">{album.artist}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <form action={addExploreAlbumAction}>
                  <input type="hidden" name="artist" value={album.artist} />
                  <input type="hidden" name="album" value={album.album} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="underline">
                    Add
                  </button>
                </form>
                <form action={wishlistExploreAlbumAction}>
                  <input type="hidden" name="artist" value={album.artist} />
                  <input type="hidden" name="album" value={album.album} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="underline">
                    Wishlist
                  </button>
                </form>
                <form action={openExploreAlbumAction} className="ml-auto">
                  <input type="hidden" name="artist" value={album.artist} />
                  <input type="hidden" name="album" value={album.album} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="text-zinc-500 underline">
                    Details
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
