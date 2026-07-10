import Link from "next/link";
import {
  listRecommendations,
  generateRecommendations,
} from "@/lib/services/recommendationService";
import {
  dismissRecommendationAction,
  addRecommendationToCollectionAction,
} from "./actions";
import { addReleaseToWishlistAction } from "../wishlist/actions";

/**
 * Async server component streamed inside a <Suspense>. On first visit (no cached
 * recommendations) it generates them, then lists; on later visits it shows the cached
 * set immediately. Server components render once per request, so there's no double run.
 */
export async function RecommendationsGrid({ userId }: { userId: string }) {
  let items = await listRecommendations(userId);
  if (items.length === 0) {
    await generateRecommendations(userId);
    items = await listRecommendations(userId);
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-zinc-500">
        No recommendations yet — add a few records to your collection and we&apos;ll
        suggest more based on your taste.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.recId}
          className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <Link
            href={`/album/${item.releaseId}`}
            className="aspect-square w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800"
          >
            {item.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            )}
          </Link>
          <div className="flex flex-col">
            <Link href={`/album/${item.releaseId}`} className="truncate font-medium hover:underline">
              {item.title}
            </Link>
            <span className="truncate text-sm text-zinc-500">
              {item.artistNames.join(", ")}
            </span>
            <span className="text-xs text-zinc-400">{item.reason}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <form action={addRecommendationToCollectionAction}>
              <input type="hidden" name="releaseId" value={item.releaseId} />
              <button type="submit" className="underline">
                Add
              </button>
            </form>
            <form action={addReleaseToWishlistAction}>
              <input type="hidden" name="releaseId" value={item.releaseId} />
              <input type="hidden" name="returnTo" value="/recommendations" />
              <button type="submit" className="underline">
                Wishlist
              </button>
            </form>
            <form action={dismissRecommendationAction} className="ml-auto">
              <input type="hidden" name="recId" value={item.recId} />
              <button type="submit" className="text-red-600 underline">
                Dismiss
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
