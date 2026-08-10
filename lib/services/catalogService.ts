import { desc, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { artists, releases } from "@/lib/db/schema";
import { albumMatchKey } from "@/lib/services/collectionService";

/**
 * Catalog rows that have a public detail page, for the sitemap.
 *
 * Album pages key off `releases.id`; artist pages key off the Discogs artist id,
 * so artists we never resolved upstream have no page and are skipped.
 */

export async function listSitemapReleases() {
  return db
    .select({ releaseId: releases.id, fetchedAt: releases.fetchedAt })
    .from(releases)
    .orderBy(desc(releases.fetchedAt));
}

/**
 * Normalized `artist::title` → release id for the whole catalog.
 *
 * Explore cards arrive from Last.fm as bare artist/title strings with no local
 * id, which is why acting on one has to resolve through Discogs. Anything we
 * have already resolved can be rendered as a plain link instead — which is also
 * the only way a crawler ever reaches an album page.
 */
export async function getReleaseIdsByAlbumKey(): Promise<Map<string, number>> {
  const result = await db.execute<{ id: number; artist: string; title: string }>(sql`
    select r.id, a.name as artist, r.title as title
    from releases r
    join release_artists ra on ra.release_id = r.id and ra.join_order = 0
    join artists a on a.id = ra.artist_id
  `);
  return new Map(result.rows.map((r) => [albumMatchKey(r.artist, r.title), r.id]));
}

export async function listSitemapArtists() {
  return db
    .select({
      discogsArtistId: artists.discogsArtistId,
      fetchedAt: artists.fetchedAt,
    })
    .from(artists)
    .where(isNotNull(artists.discogsArtistId))
    .orderBy(desc(artists.fetchedAt));
}
