import { cache, Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth-session";
import { getReleaseById } from "@/lib/services/collectionService";
import { getRelease } from "@/lib/discogs/client";
import { getAlbumInfo, getArtistInfo } from "@/lib/lastfm/client";
import { addReleaseToWishlistAction } from "@/app/(app)/wishlist/actions";
import { addAlbumToCollectionAction, dismissAlbumAction } from "./actions";
import { ShareLinkButton } from "@/app/(app)/ShareLinkButton";
import { SubmitButton } from "@/app/(app)/SubmitButton";
import { JsonLd } from "@/app/JsonLd";
import { shareUrlForPath } from "@/lib/shareUrl";
import { absoluteUrl } from "@/lib/site";

// Deduped across generateMetadata and the page render within one request.
const getReleaseCached = cache(getReleaseById);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const release = await getReleaseCached(Number(id));
  if (!release) {
    return { title: "Álbum no encontrado", robots: { index: false, follow: true } };
  }

  const artist = release.artistNames.join(", ");
  const title = artist ? `${release.title} — ${artist}` : release.title;
  const description = `${release.title}${artist ? ` de ${artist}` : ""}${
    release.year ? ` (${release.year})` : ""
  } en vinilo: ficha, sello, año y lista de canciones.`;
  const canonical = `/album/${release.releaseId}`;
  const images = release.coverUrl ? [release.coverUrl] : undefined;

  return {
    title,
    description,
    // Cards arrive with ?from=… for the back link; keep one indexable URL.
    alternates: { canonical },
    openGraph: {
      type: "music.album",
      url: canonical,
      title,
      description,
      ...(images ? { images } : {}),
    },
    // Without this the root layout's generic site card wins on Twitter/Slack.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/** Strips Last.fm's HTML + trailing "Read more on Last.fm" link from a bio/wiki summary. */
function cleanSummary(html?: string): string {
  if (!html) return "";
  return html
    .split(/<a\b/i)[0] // drop the "Read more on Last.fm" anchor and anything after
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Discogs gives track lengths as "4:27" or "1:02:11"; schema.org wants ISO 8601. */
function isoDuration(duration: string): string | undefined {
  const parts = duration.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return undefined;
  const [h, m, s] =
    parts.length === 3 ? parts : parts.length === 2 ? [0, ...parts] : [0, 0, parts[0]];
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
}

/** Validates a `from` origin the same way server actions validate `returnTo`. */
function safeFrom(from?: string): string | null {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) {
    return null;
  }
  return from;
}

/** Labels the back link based on which page the user arrived from. */
function backLabel(from: string): string {
  if (from.startsWith("/collection")) return "Volver a tu colección";
  if (from.startsWith("/wishlist")) return "Volver a tu lista de deseos";
  if (from.startsWith("/users/")) return "Volver al perfil";
  if (from.startsWith("/artist/")) return "Volver al artista";
  if (from.startsWith("/explore")) return "Volver a Explorar";
  return "Volver a Descubrir";
}

function metadataBlurb(
  title: string,
  artistNames: string[],
  genres: string[] | null,
  styles: string[] | null,
  year: number | null,
  labelName: string | null,
): string {
  const artist = artistNames.join(", ") || "un artista desconocido";
  const descriptors = [...(styles ?? []), ...(genres ?? [])];
  const kind =
    descriptors.length > 0 ? `disco de ${descriptors.slice(0, 3).join(", ")}` : "disco";
  const when = year ? ` editado en ${year}` : "";
  const label = labelName ? ` por el sello ${labelName}` : "";
  return `${title} es un ${kind} de ${artist}${when}${label}.`;
}

type Release = NonNullable<Awaited<ReturnType<typeof getReleaseById>>>;

/**
 * Bio and tracklist, both of which need Last.fm and Discogs.
 *
 * Split out and suspended so the slow third-party calls stream in behind the
 * record itself. Keeping them out of the page body is what lets `notFound()`
 * still set a 404 status — see the note on the page component.
 */
async function AlbumDetails({ release }: { release: Release }) {
  const primaryArtist = release.artistNames[0] ?? "";
  const [albumInfo, artistInfo, discogsDetail] = await Promise.all([
    primaryArtist ? getAlbumInfo(primaryArtist, release.title) : Promise.resolve(null),
    primaryArtist ? getArtistInfo(primaryArtist) : Promise.resolve(null),
    release.discogsReleaseId
      ? getRelease(release.discogsReleaseId).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Discogs returns tracklist entries in play order; drop non-track rows (headings/indexes).
  const tracks = (discogsDetail?.tracklist ?? []).filter(
    (t) => !t.type_ || t.type_ === "track",
  );

  const description =
    cleanSummary(albumInfo?.summary) ||
    cleanSummary(artistInfo?.bio?.summary) ||
    metadataBlurb(
      release.title,
      release.artistNames,
      release.genres,
      release.styles,
      release.year,
      release.labelName,
    );

  const coverUrl = release.coverUrl || albumInfo?.imageUrl || "";
  const tags = [...new Set([...(release.genres ?? []), ...(release.styles ?? [])])];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: release.title,
    url: absoluteUrl(`/album/${release.releaseId}`),
    ...(coverUrl ? { image: coverUrl } : {}),
    description,
    ...(release.year ? { datePublished: String(release.year) } : {}),
    ...(release.credits.length > 0
      ? {
          byArtist: release.credits.map((credit) => ({
            "@type": "MusicGroup",
            name: credit.name,
            ...(credit.discogsArtistId
              ? { url: absoluteUrl(`/artist/${credit.discogsArtistId}`) }
              : {}),
          })),
        }
      : {}),
    ...(release.labelName ? { recordLabel: release.labelName } : {}),
    ...(tags.length > 0 ? { genre: tags } : {}),
    ...(tracks.length > 0
      ? {
          numTracks: tracks.length,
          track: tracks.map((track, index) => ({
            "@type": "MusicRecording",
            name: track.title,
            position: index + 1,
            ...(track.duration ? { duration: isoDuration(track.duration) } : {}),
          })),
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="max-w-2xl">
        <h2 className="mb-2 text-lg font-medium">Sobre este álbum</h2>
        <p className="text-sm leading-relaxed text-room-dim">{description}</p>
      </div>

      {tracks.length > 0 && (
        <section aria-labelledby="tracklist-heading" className="max-w-2xl">
          <h2 id="tracklist-heading" className="mb-2 text-lg font-medium">
            Lista de canciones
          </h2>
          <ol className="divide-y divide-room-rule">
            {tracks.map((track, index) => (
              <li key={index} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="w-8 shrink-0 text-room-dim">
                  {track.position || index + 1}
                </span>
                <span className="flex-1 text-room-fg">{track.title}</span>
                {track.duration && <span className="text-room-dim">{track.duration}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function AlbumDetailsSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-3" aria-hidden>
      <div className="sheen h-5 w-40 rounded" />
      <div className="sheen h-4 w-full rounded" />
      <div className="sheen h-4 w-5/6 rounded" />
      <div className="sheen mt-4 h-5 w-40 rounded" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="sheen h-4 w-full rounded" />
      ))}
    </div>
  );
}

/**
 * There is deliberately no `loading.tsx` for this route. That file wraps the
 * page in a Suspense boundary, which flushes the shell — and with it a 200 —
 * before this component can call `notFound()`, turning every bad id into a soft
 * 404. Awaiting only the release lookup here keeps the status honest; the slow
 * work streams from <AlbumDetails> below.
 */
export default async function AlbumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getOptionalSession();
  const { id } = await params;
  const { from } = await searchParams;
  const release = await getReleaseCached(Number(id));
  if (!release) notFound();

  const coverUrl = release.coverUrl || "";
  // Genres and styles can overlap (e.g. "Reggae" in both); keep first occurrence only.
  const tags = [...new Set([...(release.genres ?? []), ...(release.styles ?? [])])];
  const origin = safeFrom(from);
  const backHref = origin ?? (session ? "/recommendations" : "/explore");
  const backText = origin
    ? backLabel(origin)
    : session
      ? "Volver a Descubrir"
      : "Volver a Explorar";
  // Keep the origin through add/wishlist actions so the back link survives a round-trip.
  const returnTo = origin
    ? `/album/${release.releaseId}?from=${encodeURIComponent(origin)}`
    : `/album/${release.releaseId}`;
  const loginHref = `/login?next=${encodeURIComponent(returnTo)}`;
  const shareUrl = shareUrlForPath(`/album/${release.releaseId}`, await headers());
  const artist = release.artistNames.join(", ");
  const shareTitle = artist ? `${release.title} — ${artist}` : release.title;
  const shareButtonClassName =
    "min-h-11 w-full rounded-lg border border-room-rule px-4 py-2 text-sm font-medium transition-colors hover:border-room-dim active:border-room-dim sm:min-h-0 sm:w-auto";

  return (
    <div className="flex flex-col gap-6">
      <Link href={backHref} className="text-sm text-room-dim hover:text-room-accent">
        ← {backText}
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded bg-room-sunk">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`Portada de ${release.title}`}
              width={320}
              height={320}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{release.title}</h1>
            <p className="text-lg text-room-dim">
              {release.credits.map((credit, index) => (
                <span key={`${credit.name}-${index}`}>
                  {index > 0 && ", "}
                  {credit.discogsArtistId ? (
                    <Link
                      href={`/artist/${credit.discogsArtistId}`}
                      className="hover:text-room-accent"
                    >
                      {credit.name}
                    </Link>
                  ) : (
                    credit.name
                  )}
                </span>
              ))}
            </p>
          </div>
          <p className="text-sm text-room-dim">
            {[release.year, release.labelName, release.country].filter(Boolean).join(" · ")}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-room-rule px-3 py-1 text-xs text-room-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {session ? (
              <>
                <form action={addAlbumToCollectionAction} className="w-full sm:w-auto">
                  <input type="hidden" name="releaseId" value={release.releaseId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton
                    pendingText="Añadiendo…"
                    className="min-h-11 w-full rounded-lg bg-room-accent px-4 py-2 text-sm font-medium text-room-on-accent shadow-sm transition-colors hover:opacity-90 active:opacity-90 sm:min-h-0 sm:w-auto"
                  >
                    Añadir a la colección
                  </SubmitButton>
                </form>
                <form action={addReleaseToWishlistAction} className="w-full sm:w-auto">
                  <input type="hidden" name="releaseId" value={release.releaseId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton
                    pendingText="Añadiendo…"
                    className="min-h-11 w-full rounded-lg border border-room-rule px-4 py-2 text-sm font-medium transition-colors hover:border-room-dim active:border-room-dim sm:min-h-0 sm:w-auto"
                  >
                    Lista de deseos
                  </SubmitButton>
                </form>
                <form action={dismissAlbumAction} className="w-full sm:w-auto">
                  <input type="hidden" name="releaseId" value={release.releaseId} />
                  {/* Dismiss returns to wherever the user came from, like the other actions. */}
                  <input type="hidden" name="returnTo" value={origin ?? "/recommendations"} />
                  <SubmitButton
                    pendingText="Descartando…"
                    className="min-h-11 w-full px-2 py-2 text-sm text-room-danger hover:underline active:opacity-70 sm:min-h-0 sm:w-auto"
                  >
                    Descartar
                  </SubmitButton>
                </form>
              </>
            ) : (
              <Link
                href={loginHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-room-accent px-4 py-2 text-sm font-medium text-room-on-accent shadow-sm transition-colors hover:opacity-90 active:opacity-90 sm:min-h-0 sm:w-auto"
              >
                Inicia sesión para añadir o guardar
              </Link>
            )}
            <ShareLinkButton
              url={shareUrl}
              label="Compartir"
              title={shareTitle}
              className={shareButtonClassName}
            />
          </div>
        </div>
      </div>

      <Suspense fallback={<AlbumDetailsSkeleton />}>
        <AlbumDetails release={release} />
      </Suspense>
    </div>
  );
}
