import { requireSession } from "@/lib/auth-session";
import { listRecommendations } from "@/lib/services/recommendationService";
import {
  refreshRecommendationsAction,
  dismissRecommendationAction,
  addRecommendationToCollectionAction,
} from "./actions";
import { addReleaseToWishlistAction } from "../wishlist/actions";

export default async function RecommendationsPage() {
  const session = await requireSession();
  const items = await listRecommendations(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={
          items.length === 0
            ? "flex flex-col items-center gap-4 text-center"
            : "flex items-center justify-between"
        }
      >
        <h1 className="text-2xl font-semibold">Recommendations</h1>
        <form action={refreshRecommendationsAction}>
          <button
            type="submit"
            className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Refresh recommendations
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-zinc-500">
          No recommendations yet. Click <strong>Refresh recommendations</strong> to
          generate some based on your collection (you&apos;ll need a few records added
          first).
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.recId}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3"
            >
              <div className="aspect-square w-full overflow-hidden rounded bg-zinc-100">
                {item.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="truncate font-medium">{item.title}</span>
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
      )}
    </div>
  );
}
