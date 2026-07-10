import Link from "next/link";
import type { ExploreSearchResult } from "./actions";
import { DiscoveryAlbumCard } from "./DiscoveryAlbumCard";

function ArtistImage({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <div className="aspect-square overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xl font-semibold text-zinc-500">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function ExploreSearchResults({
  result,
  returnTo,
}: {
  result: ExploreSearchResult;
  returnTo: string;
}) {
  const [topArtist, ...otherArtists] = result.artists;
  if (!topArtist && result.albums.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center text-zinc-500 dark:border-zinc-700">
        No artists or records found for “{result.query}”
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-9">
      {topArtist && (
        <section aria-labelledby="top-result-heading">
          <h2 id="top-result-heading" className="mb-3 text-lg font-semibold">
            Top result
          </h2>
          <Link
            href={`/artist/${topArtist.id}`}
            className="flex min-h-40 items-center gap-5 rounded-2xl border border-zinc-200 bg-zinc-100 p-5 transition-colors hover:border-red-400 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="w-24 shrink-0 sm:w-28">
              <ArtistImage name={topArtist.name} imageUrl={topArtist.imageUrl} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold sm:text-3xl">{topArtist.name}</p>
              <p className="mt-2 text-sm text-zinc-500">Artist</p>
            </div>
          </Link>
        </section>
      )}

      {otherArtists.length > 0 && (
        <section aria-labelledby="artists-heading">
          <h2 id="artists-heading" className="mb-3 text-lg font-semibold">
            Artists
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {otherArtists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.id}`}
                className="rounded-xl border border-zinc-200 p-3 transition-colors hover:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-800"
              >
                <ArtistImage name={artist.name} imageUrl={artist.imageUrl || artist.thumbUrl} />
                <p className="mt-3 truncate font-medium">{artist.name}</p>
                <p className="text-xs text-zinc-500">Artist</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {result.albums.length > 0 && (
        <section aria-labelledby="records-heading">
          <h2 id="records-heading" className="mb-3 text-lg font-semibold">
            Records
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {result.albums.map((album) => (
              <DiscoveryAlbumCard
                key={album.key}
                album={{
                  artist: album.artist,
                  title: album.title,
                  imageUrl: album.coverImage,
                  year: album.year,
                  editionCount: album.editionCount,
                }}
                returnTo={returnTo}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
