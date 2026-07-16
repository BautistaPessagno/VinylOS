import Link from "next/link";
import { listExploreGenres, listExploreAlbums } from "@/lib/services/exploreService";
import { getLibraryAlbumKeys, albumMatchKey } from "@/lib/services/collectionService";
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
}: {
  genre?: string;
  sort?: string;
  userId: string;
  focusSearch: boolean;
}) {
  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : genres[0];
  const selectedSort = parseExploreSort(sort);
  const [allAlbums, libraryKeys] = await Promise.all([
    listExploreAlbums(selected),
    getLibraryAlbumKeys(userId),
  ]);
  // Hide albums the user already owns or has wishlisted (matched by normalized artist+title).
  const albums = sortExploreAlbums(
    allAlbums.filter((a) => !libraryKeys.has(albumMatchKey(a.artist, a.album))),
    selectedSort,
  );
  const returnTo = `/recommendations?tab=explore&genre=${encodeURIComponent(selected)}`;

  return (
    <ExploreSearch focusOnMount={focusSearch}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* One scrollable row on mobile instead of chips wrapping into a tall block. */}
          <div className="no-scrollbar -mx-6 flex snap-x gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {genres.map((g) => {
              const isActive = g === selected;
              const params = new URLSearchParams({ tab: "explore", genre: g });
              if (selectedSort !== "relevance") params.set("sort", selectedSort);
              return (
                <Link
                  key={g}
                  href={`/recommendations?${params.toString()}`}
                  className={
                    isActive
                      ? "shrink-0 snap-start rounded-full bg-red-500 px-4 py-2 text-sm font-medium capitalize text-white active:opacity-80 sm:px-3 sm:py-1"
                      : "shrink-0 snap-start rounded-full border border-zinc-200 px-4 py-2 text-sm capitalize text-zinc-600 hover:border-red-500 hover:text-red-500 active:border-red-500 active:text-red-500 sm:px-3 sm:py-1 dark:border-zinc-700 dark:text-zinc-300"
                  }
                >
                  {g}
                </Link>
              );
            })}
          </div>

          {albums.length > 1 && (
            <form
              action="/recommendations"
              className="flex items-center gap-2 text-sm sm:ml-auto"
            >
              <input type="hidden" name="tab" value="explore" />
              <input type="hidden" name="genre" value={selected} />
              <label htmlFor="explore-browse-sort" className="text-zinc-500">
                Sort
              </label>
              <select
                id="explore-browse-sort"
                name="sort"
                defaultValue={selectedSort}
                className="min-h-11 rounded border border-zinc-300 px-2 py-1.5 text-base sm:min-h-0 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {EXPLORE_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 rounded border border-zinc-300 px-3 py-1.5 active:bg-zinc-100 sm:min-h-0 dark:border-zinc-700 dark:active:bg-zinc-800"
              >
                Apply
              </button>
            </form>
          )}
        </div>

        {albums.length === 0 ? (
          <p className="text-center text-zinc-500">
            Couldn&apos;t load albums for this genre right now. Try another.
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
                }}
                returnTo={returnTo}
              />
            ))}
          </div>
        )}
      </div>
    </ExploreSearch>
  );
}
