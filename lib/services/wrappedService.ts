import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export type WrappedStats = {
  totalRecords: number;
  topDecade: { decade: number; count: number } | null;
  topLabel: { label: string; count: number } | null;
  topArtist: { artist: string; count: number } | null;
  genreDistribution: { genre: string; count: number }[];
  countryDistribution: { country: string; count: number }[];
};

export async function getWrappedStats(userId: string): Promise<WrappedStats> {
  const [totalResult, decadeResult, labelResult, artistResult, genreResult, countryResult] =
    await Promise.all([
      db.execute<{ count: number }>(sql`
        select count(*)::int as count
        from collection_items
        where user_id = ${userId}
      `),
      db.execute<{ decade: number; count: number }>(sql`
        select (floor(r.year / 10) * 10)::int as decade, count(*)::int as count
        from collection_items ci
        join releases r on r.id = ci.release_id
        where ci.user_id = ${userId} and r.year is not null
        group by decade
        order by count desc
        limit 1
      `),
      db.execute<{ label: string; count: number }>(sql`
        select r.label_name as label, count(*)::int as count
        from collection_items ci
        join releases r on r.id = ci.release_id
        where ci.user_id = ${userId} and r.label_name is not null
        group by r.label_name
        order by count desc
        limit 1
      `),
      db.execute<{ artist: string; count: number }>(sql`
        select a.name as artist, count(*)::int as count
        from collection_items ci
        join release_artists ra on ra.release_id = ci.release_id
        join artists a on a.id = ra.artist_id
        where ci.user_id = ${userId}
        group by a.name
        order by count desc
        limit 1
      `),
      db.execute<{ genre: string; count: number }>(sql`
        select genre, count(*)::int as count
        from collection_items ci
        join releases r on r.id = ci.release_id
        cross join lateral unnest(r.genres) as genre
        where ci.user_id = ${userId}
        group by genre
        order by count desc
      `),
      db.execute<{ country: string; count: number }>(sql`
        select r.country as country, count(*)::int as count
        from collection_items ci
        join releases r on r.id = ci.release_id
        where ci.user_id = ${userId} and r.country is not null
        group by r.country
        order by count desc
      `),
    ]);

  return {
    totalRecords: totalResult.rows[0]?.count ?? 0,
    topDecade: decadeResult.rows[0] ?? null,
    topLabel: labelResult.rows[0] ?? null,
    topArtist: artistResult.rows[0] ?? null,
    genreDistribution: genreResult.rows,
    countryDistribution: countryResult.rows,
  };
}
