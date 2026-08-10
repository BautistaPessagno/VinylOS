import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth-session";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/search/searchQuery";
import { genreLabel, listExploreGenres } from "@/lib/services/exploreService";
import { ExploreTab } from "@/app/(app)/recommendations/ExploreTab";
import { TabBar } from "@/app/(app)/recommendations/TabBar";

/**
 * Only `genre` varies the content worth indexing. `sort`, `q` and `focus` reorder
 * or focus the same set, so every one of them canonicalises back to the genre.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}): Promise<Metadata> {
  const { genre } = await searchParams;
  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : null;

  if (!selected) {
    return {
      title: "Explorar vinilos",
      description:
        "Explora los discos de vinilo más escuchados por género y encuentra tu próxima compra.",
      alternates: { canonical: "/explore" },
    };
  }

  const label = genreLabel(selected);
  return {
    title: `Vinilos de ${label}`,
    description: `Los discos de ${label} más escuchados en vinilo, con ficha, sello y año de cada edición.`,
    alternates: { canonical: `/explore?genre=${encodeURIComponent(selected)}` },
  };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    focus?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const [session, { genre, focus, sort, q }] = await Promise.all([
    getOptionalSession(),
    searchParams,
  ]);

  const genres = listExploreGenres();
  const selected = genre && genres.includes(genre) ? genre : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {selected ? `Vinilos de ${genreLabel(selected)}` : "Explorar"}
      </h1>
      {session && <TabBar active="explore" />}
      <ExploreTab
        genre={genre}
        sort={sort}
        userId={session?.user.id}
        focusSearch={focus === "search"}
        initialQuery={q?.slice(0, MAX_SEARCH_QUERY_LENGTH)}
      />
    </div>
  );
}
