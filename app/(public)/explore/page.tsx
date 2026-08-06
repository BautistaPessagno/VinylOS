import { getOptionalSession } from "@/lib/auth-session";
import { ExploreTab } from "@/app/(app)/recommendations/ExploreTab";
import { TabBar } from "@/app/(app)/recommendations/TabBar";

export const metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    focus?: string;
    sort?: string;
  }>;
}) {
  const [session, { genre, focus, sort }] = await Promise.all([
    getOptionalSession(),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Explore</h1>
      {session && <TabBar active="explore" />}
      <ExploreTab
        genre={genre}
        sort={sort}
        userId={session?.user.id}
        focusSearch={focus === "search"}
      />
    </div>
  );
}
