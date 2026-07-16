import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-session";
import { getArtist, searchArtistVinylAlbums } from "@/lib/discogs/client";
import { getArtistImageUrl, parsePositiveInteger } from "@/lib/discogs/artistPage";
import { DiscoveryAlbumCard } from "../../recommendations/DiscoveryAlbumCard";

// Deduped across generateMetadata and the page render within one request.
const getArtistCached = cache(getArtist);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artistId = parsePositiveInteger(id);
  if (!artistId) return { title: "Artist not found" };
  try {
    const artist = await getArtistCached(artistId);
    return {
      title: artist.name,
      description: `${artist.name}'s vinyl releases on VinylOS.`,
    };
  } catch {
    return { title: "Artist" };
  }
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireSession();
  const [{ id }, { page }] = await Promise.all([params, searchParams]);
  const artistId = parsePositiveInteger(id);
  if (!artistId) notFound();

  let artist;
  try {
    artist = await getArtistCached(artistId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Discogs API error 404:")) {
      notFound();
    }
    throw error;
  }

  const requestedPage = parsePositiveInteger(page) ?? 1;
  let catalog = await searchArtistVinylAlbums(artist.name, requestedPage);
  if (catalog.pages > 0 && requestedPage > catalog.pages) {
    catalog = await searchArtistVinylAlbums(artist.name, catalog.pages);
  }

  const imageUrl = getArtistImageUrl(artist);
  const returnTo = `/artist/${artist.id}?page=${catalog.page}`;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/recommendations?tab=explore&focus=search"
        className="self-start text-sm text-zinc-500 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        ← Back to search
      </Link>

      <section className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-zinc-100 p-6 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-zinc-200 shadow-sm dark:bg-zinc-800">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={artist.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-semibold text-zinc-500">
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{artist.name}</h1>
          {artist.profile && (
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {artist.profile}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="artist-records-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="artist-records-heading" className="text-2xl font-semibold">
              Records
            </h2>
            <p className="text-sm text-zinc-500">
              {catalog.totalItems.toLocaleString()} vinyl editions on Discogs
            </p>
          </div>
          {catalog.pages > 1 && (
            <p className="text-sm text-zinc-500">
              Page {catalog.page} of {catalog.pages}
            </p>
          )}
        </div>

        {catalog.albums.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center text-zinc-500 dark:border-zinc-700">
            Discogs has no vinyl records for this artist on this page.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {catalog.albums.map((album) => (
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
        )}

        {catalog.pages > 1 && (
          <nav aria-label="Artist records pagination" className="flex items-center justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
            {catalog.page > 1 ? (
              <Link
                href={`/artist/${artist.id}?page=${catalog.page - 1}`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-red-500 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-700"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {catalog.page < catalog.pages && (
              <Link
                href={`/artist/${artist.id}?page=${catalog.page + 1}`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-red-500 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-700"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
