import { Suspense } from "react";
import { requireSession } from "@/lib/auth-session";
import { refreshRecommendationsAction } from "./actions";
import { TabBar } from "./TabBar";
import { RecommendationsGrid } from "./RecommendationsGrid";
import { RecommendationsSkeleton } from "./RecommendationsSkeleton";
import { ExploreTab } from "./ExploreTab";

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; genre?: string }>;
}) {
  const session = await requireSession();
  const { tab, genre } = await searchParams;
  const activeTab = tab === "explore" ? "explore" : "recommendations";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Discover</h1>
        {activeTab === "recommendations" && (
          <form action={refreshRecommendationsAction}>
            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Refresh recommendations
            </button>
          </form>
        )}
      </div>

      <TabBar active={activeTab} />

      {activeTab === "recommendations" ? (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <RecommendationsGrid userId={session.user.id} />
        </Suspense>
      ) : (
        <ExploreTab genre={genre} />
      )}
    </div>
  );
}
