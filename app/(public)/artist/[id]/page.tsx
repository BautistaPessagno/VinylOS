import { cache } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth-session";
import { getArtist, searchArtistVinylAlbums } from "@/lib/discogs/client";
import { getArtistImageUrl, parsePositiveInteger } from "@/lib/discogs/artistPage";
import { albumMatchKey } from "@/lib/services/albumKey";
import { getLibraryAlbumKeys } from "@/lib/services/collectionService";
import { DiscoveryAlbumCard } from "@/app/(app)/recommendations/DiscoveryAlbumCard";
import { ShareLinkButton } from "@/app/(app)/ShareLinkButton";
import { JsonLd } from "@/app/JsonLd";
import { shareUrlForPath } from "@/lib/shareUrl";
import { absoluteUrl } from "@/lib/site";

// Deduped across generateMetadata and the page render within one request.
const getArtistCached = cache(getArtist);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artistId = parsePositiveInteger(id);
  if (!artistId) {
    return { title: "Artista no encontrado", robots: { index: false, follow: true } };
  }
  try {
    const artist = await getArtistCached(artistId);
    const description = `Discografía en vinilo de ${artist.name}: ediciones, sellos y años de publicación.`;
    const canonical = `/artist/${artistId}`;
    const image = getArtistImageUrl(artist);

    return {
      title: artist.name,
      description,
      // Pagination lives on ?page=; one canonical keeps the set from splitting.
      alternates: { canonical },
      openGraph: {
        type: "profile",
        url: canonical,
        title: artist.name,
        description,
        ...(image ? { images: [image] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: artist.name,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: "Artista", robots: { index: false, follow: true } };
  }
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getOptionalSession();
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
  // Which of this artist's records the viewer already has, so each card offers only
  // the action that still applies.
  const libraryKeys = session
    ? await getLibraryAlbumKeys(session.user.id)
    : { collection: new Set<string>(), wishlist: new Set<string>() };
  const returnTo = `/artist/${artist.id}?page=${catalog.page}`;
  const backHref = "/explore?focus=search";
  const backLabel = "← Volver a la búsqueda";
  const shareUrl = shareUrlForPath(`/artist/${artistId}`, await headers());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/artist/${artistId}`),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(artist.profile ? { description: artist.profile } : {}),
  };

  return (
    <div className="flex flex-col gap-8">
      <JsonLd data={jsonLd} />
      <Link
        href={backHref}
        className="self-start text-sm text-room-dim hover:text-room-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-room-accent"
      >
        {backLabel}
      </Link>

      <section className="flex flex-col gap-6 rounded-2xl border border-room-rule bg-room-surface p-6 sm:flex-row sm:items-center">
        <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full bg-room-sunk shadow-sm">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Foto de ${artist.name}`}
              width={144}
              height={144}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-semibold text-room-dim">
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{artist.name}</h1>
          {artist.profile && (
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-room-dim">
              {artist.profile}
            </p>
          )}
          <ShareLinkButton
            url={shareUrl}
            label="Compartir"
            title={artist.name}
            className="mt-4 min-h-11 w-fit rounded-lg border border-room-rule px-4 py-2 text-sm font-medium transition-colors hover:border-room-dim active:border-room-dim sm:min-h-0"
          />
        </div>
      </section>

      <section aria-labelledby="artist-records-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="artist-records-heading" className="text-2xl font-semibold">
              Discos
            </h2>
            <p className="text-sm text-room-dim">
              {catalog.totalItems.toLocaleString("es-ES")} ediciones en vinilo en Discogs
            </p>
          </div>
          {catalog.pages > 1 && (
            <p className="text-sm text-room-dim">
              Página {catalog.page} de {catalog.pages}
            </p>
          )}
        </div>

        {catalog.albums.length === 0 ? (
          <p className="rounded-xl border border-dashed border-room-rule px-5 py-10 text-center text-room-dim">
            Discogs no tiene discos de vinilo de este artista en esta página.
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
                signedIn={Boolean(session)}
                inCollection={libraryKeys.collection.has(
                  albumMatchKey(album.artist, album.title),
                )}
                inWishlist={libraryKeys.wishlist.has(
                  albumMatchKey(album.artist, album.title),
                )}
              />
            ))}
          </div>
        )}

        {catalog.pages > 1 && (
          <nav aria-label="Paginación de discos del artista" className="flex items-center justify-between border-t border-room-rule pt-5">
            {catalog.page > 1 ? (
              <Link
                href={`/artist/${artist.id}?page=${catalog.page - 1}`}
                className="rounded-full border border-room-rule px-4 py-2 text-sm hover:border-room-accent hover:text-room-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-room-accent"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            {catalog.page < catalog.pages && (
              <Link
                href={`/artist/${artist.id}?page=${catalog.page + 1}`}
                className="rounded-full border border-room-rule px-4 py-2 text-sm hover:border-room-accent hover:text-room-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-room-accent"
              >
                Siguiente →
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
