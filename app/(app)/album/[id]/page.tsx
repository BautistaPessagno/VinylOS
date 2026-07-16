import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth-session";
import { getReleaseById } from "@/lib/services/collectionService";
import { getRelease } from "@/lib/discogs/client";
import { getAlbumInfo, getArtistInfo } from "@/lib/lastfm/client";
import { addReleaseToWishlistAction } from "../../wishlist/actions";
import { addAlbumToCollectionAction, dismissAlbumAction } from "./actions";
import { SubmitButton } from "../../SubmitButton";

// Deduped across generateMetadata and the page render within one request.
const getReleaseCached = cache(getReleaseById);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const release = await getReleaseCached(Number(id));
  if (!release) return { title: "Album not found" };

  const artist = release.artistNames.join(", ");
  const title = artist ? `${release.title} — ${artist}` : release.title;
  const description = `${release.title}${artist ? ` by ${artist}` : ""}${
    release.year ? ` (${release.year})` : ""
  } on VinylOS.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(release.coverUrl ? { images: [release.coverUrl] } : {}),
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

/** Validates a `from` origin the same way server actions validate `returnTo`. */
function safeFrom(from?: string): string | null {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) {
    return null;
  }
  return from;
}

/** Labels the back link based on which page the user arrived from. */
function backLabel(from: string): string {
  if (from.startsWith("/collection")) return "Back to your collection";
  if (from.startsWith("/wishlist")) return "Back to your wishlist";
  if (from.startsWith("/users/")) return "Back to profile";
  if (from.startsWith("/artist/")) return "Back to artist";
  return "Back to Discover";
}

function metadataBlurb(
  title: string,
  artistNames: string[],
  genres: string[] | null,
  styles: string[] | null,
  year: number | null,
  labelName: string | null,
): string {
  const artist = artistNames.join(", ") || "an unknown artist";
  const descriptors = [...(styles ?? []), ...(genres ?? [])];
  const kind = descriptors.length > 0 ? `${descriptors.slice(0, 3).join(", ")} record` : "record";
  const when = year ? ` released in ${year}` : "";
  const label = labelName ? ` on ${labelName}` : "";
  return `${title} is a ${kind} by ${artist}${when}${label}.`;
}

export default async function AlbumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const { from } = await searchParams;
  const release = await getReleaseCached(Number(id));
  if (!release) notFound();

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
  const tags = [...(release.genres ?? []), ...(release.styles ?? [])];
  const origin = safeFrom(from);
  const backHref = origin ?? "/recommendations";
  const backText = origin ? backLabel(origin) : "Back to Discover";
  // Keep the origin through add/wishlist actions so the back link survives a round-trip.
  const returnTo = origin
    ? `/album/${release.releaseId}?from=${encodeURIComponent(origin)}`
    : `/album/${release.releaseId}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href={backHref} className="text-sm text-zinc-500 hover:text-red-500">
        ← {backText}
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={release.title} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{release.title}</h1>
            <p className="text-lg text-zinc-500">{release.artistNames.join(", ")}</p>
          </div>
          <p className="text-sm text-zinc-400">
            {[release.year, release.labelName, release.country].filter(Boolean).join(" · ")}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <form action={addAlbumToCollectionAction} className="w-full sm:w-auto">
              <input type="hidden" name="releaseId" value={release.releaseId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton
                pendingText="Adding…"
                className="min-h-11 w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-zinc-800 sm:min-h-0 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
              >
                Add to collection
              </SubmitButton>
            </form>
            <form action={addReleaseToWishlistAction} className="w-full sm:w-auto">
              <input type="hidden" name="releaseId" value={release.releaseId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton
                pendingText="Adding…"
                className="min-h-11 w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:border-zinc-500 active:border-zinc-500 sm:min-h-0 sm:w-auto dark:border-zinc-700"
              >
                Wishlist
              </SubmitButton>
            </form>
            <form action={dismissAlbumAction} className="w-full sm:w-auto">
              <input type="hidden" name="releaseId" value={release.releaseId} />
              {/* Dismiss returns to wherever the user came from, like the other actions. */}
              <input type="hidden" name="returnTo" value={origin ?? "/recommendations"} />
              <SubmitButton
                pendingText="Dismissing…"
                className="min-h-11 w-full px-2 py-2 text-sm text-red-600 hover:underline active:opacity-70 sm:min-h-0 sm:w-auto"
              >
                Dismiss
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <h2 className="mb-2 text-lg font-medium">About this album</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </div>

      {tracks.length > 0 && (
        <section aria-labelledby="tracklist-heading" className="max-w-2xl">
          <h2 id="tracklist-heading" className="mb-2 text-lg font-medium">
            Tracklist
          </h2>
          <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tracks.map((track, index) => (
              <li
                key={index}
                className="flex items-baseline gap-3 py-2 text-sm"
              >
                <span className="w-8 shrink-0 text-zinc-400">
                  {track.position || index + 1}
                </span>
                <span className="flex-1 text-zinc-700 dark:text-zinc-200">
                  {track.title}
                </span>
                {track.duration && (
                  <span className="text-zinc-400">{track.duration}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
