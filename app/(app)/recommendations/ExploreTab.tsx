import Link from "next/link";
import {
  genreLabel,
  listExploreGenres,
  listExploreAlbums,
} from "@/lib/services/exploreService";
import { getLibraryAlbumKeys, albumMatchKey } from "@/lib/services/collectionService";
import { getReleaseIdsByAlbumKey } from "@/lib/services/catalogService";
import {
  EXPLORE_SORT_OPTIONS,
  parseExploreSort,
  sortExploreAlbums,
} from "@/lib/services/exploreSort";
import { ExploreSearch } from "./ExploreSearch";
import { DiscoveryAlbumCard } from "./DiscoveryAlbumCard";

/**
 * Discovery tab: browse top albums by genre (Last.fm charts), independent of what the
 * user owns. Cards render straight from Last.fm data; a Discogs release is resolved only
 * when the user acts on a card (Add / Wishlist / Details).
 */
export async function ExploreTab({
  genre,
  sort,
  userId,
  focusSearch,
  initialQuery,
}: {
  genre?: string;
  sort?: string;
  userId?: string;
  focusSearch: boolean;
  initialQuery?: string;
}) {
  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : genres[0];
  const selectedSort = parseExploreSort(sort);
  const [allAlbums, libraryKeys, releaseIdsByKey] = await Promise.all([
    listExploreAlbums(selected),
    userId ? getLibraryAlbumKeys(userId) : Promise.resolve(new Set<string>()),
    getReleaseIdsByAlbumKey(),
  ]);
  // Hide albums the user already owns or has wishlisted (matched by normalized artist+title).
  const albums = sortExploreAlbums(
    allAlbums.filter((a) => !libraryKeys.has(albumMatchKey(a.artist, a.album))),
    selectedSort,
  );
  const returnParams = new URLSearchParams({ genre: selected });
  if (selectedSort !== "relevance") returnParams.set("sort", selectedSort);
  const returnTo = `/explore?${returnParams.toString()}`;

  return (
    <ExploreSearch
      focusOnMount={focusSearch}
      initialQuery={initialQuery}
      signedIn={Boolean(userId)}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* One scrollable row on mobile instead of chips wrapping into a tall block. */}
          <div className="no-scrollbar -mx-6 flex snap-x gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {genres.map((g) => {
              const isActive = g === selected;
              const params = new URLSearchParams({ genre: g });
              if (selectedSort !== "relevance") params.set("sort", selectedSort);
              return (
                <Link
                  key={g}
                  href={`/explore?${params.toString()}`}
                  className={
                    isActive
                      ? "shrink-0 snap-start rounded-full bg-room-accent px-4 py-2 text-sm font-medium capitalize text-room-on-accent active:opacity-80 sm:px-3 sm:py-1"
                      : "shrink-0 snap-start rounded-full border border-room-rule px-4 py-2 text-sm capitalize text-room-dim hover:border-room-accent hover:text-room-accent active:border-room-accent active:text-room-accent sm:px-3 sm:py-1"
                  }
                >
                  {genreLabel(g)}
                </Link>
              );
            })}
          </div>

          {albums.length > 1 && (
            <form
              action="/explore"
              className="flex items-center gap-2 text-sm sm:ml-auto"
            >
              <input type="hidden" name="genre" value={selected} />
              <label htmlFor="explore-browse-sort" className="text-room-dim">
                Ordenar
              </label>
              <select
                id="explore-browse-sort"
                name="sort"
                defaultValue={selectedSort}
                className="min-h-11 rounded border border-room-rule px-2 py-1.5 text-base sm:min-h-0 sm:text-sm"
              >
                {EXPLORE_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 rounded border border-room-rule px-3 py-1.5 active:bg-room-sunk sm:min-h-0"
              >
                Aplicar
              </button>
            </form>
          )}
        </div>

        {albums.length === 0 ? (
          <p className="text-center text-room-dim">
            No pudimos cargar álbumes de este género ahora mismo. Prueba con otro.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {albums.map((album) => (
              <DiscoveryAlbumCard
                key={`${album.artist}::${album.album}`}
                album={{
                  artist: album.artist,
                  title: album.album,
                  imageUrl: album.imageUrl,
                  releaseId: releaseIdsByKey.get(
                    albumMatchKey(album.artist, album.album),
                  ),
                }}
                returnTo={returnTo}
                signedIn={Boolean(userId)}
                guestActionMode="pending"
              />
            ))}
          </div>
        )}
      </div>
    </ExploreSearch>
  );
}
