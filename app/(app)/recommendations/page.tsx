import { Suspense } from "react";
import { requireSession } from "@/lib/auth-session";
import { refreshRecommendationsAction } from "./actions";
import { SubmitButton } from "../SubmitButton";
import { TabBar } from "./TabBar";
import { RecommendationsGrid } from "./RecommendationsGrid";
import { RecommendationsSkeleton } from "./RecommendationsSkeleton";
import { ExploreTab } from "./ExploreTab";

export const metadata = { title: "Discover" };

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    genre?: string;
    focus?: string;
    sort?: string;
  }>;
}) {
  const session = await requireSession();
  const { tab, genre, focus, sort } = await searchParams;
  const activeTab = tab === "explore" ? "explore" : "recommendations";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Discover</h1>
        {activeTab === "recommendations" && (
          <form action={refreshRecommendationsAction}>
            <SubmitButton
              pendingText="Refreshing…"
              className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
            >
              Refresh recommendations
            </SubmitButton>
          </form>
        )}
      </div>

      <TabBar active={activeTab} />

      {activeTab === "recommendations" ? (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <RecommendationsGrid userId={session.user.id} genre={genre} sort={sort} />
        </Suspense>
      ) : (
        <ExploreTab
          genre={genre}
          sort={sort}
          userId={session.user.id}
          focusSearch={focus === "search"}
        />
      )}
    </div>
  );
}
