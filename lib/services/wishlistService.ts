import { db } from "@/lib/db/client";
import { releases, artists, releaseArtists, wishlistItems } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function addWishlistItem(userId: string, releaseId: number) {
  const [item] = await db
    .insert(wishlistItems)
    .values({ userId, releaseId })
    // Re-adding an album already on the wishlist is a safe no-op rather than an error.
    .onConflictDoNothing({ target: [wishlistItems.userId, wishlistItems.releaseId] })
    .returning({ id: wishlistItems.id });
  return item?.id ?? null;
}

export async function removeWishlistItem(userId: string, itemId: number) {
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)));
}

export async function listWishlistItems(userId: string) {
  const rows = await db
    .select({
      itemId: wishlistItems.id,
      addedAt: wishlistItems.addedAt,
      releaseId: releases.id,
      title: releases.title,
      year: releases.year,
      country: releases.country,
      coverUrl: releases.coverUrl,
      thumbUrl: releases.thumbUrl,
      genres: releases.genres,
      labelName: releases.labelName,
    })
    .from(wishlistItems)
    .innerJoin(releases, eq(wishlistItems.releaseId, releases.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.addedAt));

  if (rows.length === 0) return [];

  const releaseIds = [...new Set(rows.map((r) => r.releaseId))];
  const artistRows = await db
    .select({
      releaseId: releaseArtists.releaseId,
      artistName: artists.name,
      joinOrder: releaseArtists.joinOrder,
    })
    .from(releaseArtists)
    .innerJoin(artists, eq(releaseArtists.artistId, artists.id))
    .where(inArray(releaseArtists.releaseId, releaseIds))
    .orderBy(releaseArtists.joinOrder);

  const artistsByRelease = new Map<number, string[]>();
  for (const row of artistRows) {
    const list = artistsByRelease.get(row.releaseId) ?? [];
    list.push(row.artistName);
    artistsByRelease.set(row.releaseId, list);
  }

  return rows.map((row) => ({
    ...row,
    artistNames: artistsByRelease.get(row.releaseId) ?? [],
  }));
}
