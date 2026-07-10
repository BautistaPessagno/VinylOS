import Link from "next/link";
import { listExploreGenres, listExploreAlbums } from "@/lib/services/exploreService";
import { getLibraryAlbumKeys, albumMatchKey } from "@/lib/services/collectionService";
import { ExploreSearch } from "./ExploreSearch";
import { DiscoveryAlbumCard } from "./DiscoveryAlbumCard";

/**
 * Discovery tab: browse top albums by genre (Last.fm charts), independent of what the
 * user owns. Cards render straight from Last.fm data; a Discogs release is resolved only
 * when the user acts on a card (Add / Wishlist / Details).
 */
export async function ExploreTab({
  genre,
  userId,
  focusSearch,
}: {
  genre?: string;
  userId: string;
  focusSearch: boolean;
}) {
  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : genres[0];
  const [allAlbums, libraryKeys] = await Promise.all([
    listExploreAlbums(selected),
    getLibraryAlbumKeys(userId),
  ]);
  // Hide albums the user already owns or has wishlisted (matched by normalized artist+title).
  const albums = allAlbums.filter(
    (a) => !libraryKeys.has(albumMatchKey(a.artist, a.album)),
  );
  const returnTo = `/recommendations?tab=explore&genre=${encodeURIComponent(selected)}`;

  return (
    <ExploreSearch focusOnMount={focusSearch}>
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
