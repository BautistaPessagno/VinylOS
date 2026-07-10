import { db } from "@/lib/db/client";
import {
  releases,
  artists,
  releaseArtists,
  collectionItems,
} from "@/lib/db/schema";
import { eq, and, ilike, arrayContains, desc, inArray, isNotNull, ne, sql } from "drizzle-orm";
import type {
  ReleaseFormOutput,
  CollectionItemFormOutput,
} from "@/lib/validation/collectionItem";
import {
  buildCollectionFilterOptions,
  type CollectionFilterOptions,
} from "./collectionFilterOptions";

async function findOrCreateArtistByName(name: string): Promise<number> {
  const [existing] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(ilike(artists.name, name))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(artists).values({ name }).returning({ id: artists.id });
  return created.id;
}

async function linkReleaseArtists(releaseId: number, artistIds: number[]) {
  if (artistIds.length === 0) return;
  await db
    .insert(releaseArtists)
    .values(
      artistIds.map((artistId, index) => ({
        releaseId,
        artistId,
        joinOrder: index,
      })),
    )
    .onConflictDoNothing();
}

/**
 * Inserts or updates a release. When `discogsReleaseId` is set, this upserts the
 * catalog cache row for that Discogs release; when absent, it always inserts a new
 * manual entry (Postgres never matches NULL against NULL for the unique constraint).
 * Either way, the submitted (possibly user-edited) field values are what get persisted —
 * search-add prefills the form but doesn't force the original Discogs values.
 */
export async function upsertRelease(
  input: ReleaseFormOutput & { masterId?: number },
): Promise<number> {
  const values = {
    discogsReleaseId: input.discogsReleaseId,
    masterId: input.masterId,
    title: input.title,
    year: input.year,
    country: input.country,
    labelName: input.labelName,
    catalogNumber: input.catalogNumber,
    genres: input.genres,
    styles: input.styles,
    coverUrl: input.coverUrl || undefined,
    thumbUrl: input.thumbUrl || undefined,
  };

  const [release] = await db
    .insert(releases)
    .values(values)
    .onConflictDoUpdate({
      target: releases.discogsReleaseId,
      set: { ...values, fetchedAt: new Date() },
    })
    .returning({ id: releases.id });

  const artistIds = await Promise.all(
    input.artistNames.map((name) => findOrCreateArtistByName(name)),
  );
  await linkReleaseArtists(release.id, artistIds);

  return release.id;
}

export async function addCollectionItem(
  userId: string,
  releaseId: number,
  input: CollectionItemFormOutput,
  source: "manual" | "discogs_sync",
) {
  const [item] = await db
    .insert(collectionItems)
    .values({
      userId,
      releaseId,
      rating: input.rating,
      notes: input.notes,
      folder: input.folder,
      mediaCondition: input.mediaCondition,
      sleeveCondition: input.sleeveCondition,
      purchasePrice: input.purchasePrice?.toString(),
      purchaseDate: input.purchaseDate || undefined,
      purchaseLocation: input.purchaseLocation,
      source,
    })
    // Re-adding an album already in the collection is a safe no-op rather than an error.
    .onConflictDoNothing({ target: [collectionItems.userId, collectionItems.releaseId] })
    .returning({ id: collectionItems.id });
  return item?.id ?? null;
}

export async function updateCollectionItem(
  userId: string,
  itemId: number,
  input: CollectionItemFormOutput,
) {
  await db
    .update(collectionItems)
    .set({
      rating: input.rating,
      notes: input.notes,
      folder: input.folder,
      mediaCondition: input.mediaCondition,
      sleeveCondition: input.sleeveCondition,
      purchasePrice: input.purchasePrice?.toString(),
      purchaseDate: input.purchaseDate || undefined,
      purchaseLocation: input.purchaseLocation,
    })
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, userId)));
}

export async function removeCollectionItem(userId: string, itemId: number) {
  await db
    .delete(collectionItems)
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, userId)));
}

export async function getCollectionItem(userId: string, itemId: number) {
  const [item] = await db
    .select({
      id: collectionItems.id,
      rating: collectionItems.rating,
      notes: collectionItems.notes,
      folder: collectionItems.folder,
      mediaCondition: collectionItems.mediaCondition,
      sleeveCondition: collectionItems.sleeveCondition,
      purchasePrice: collectionItems.purchasePrice,
      purchaseDate: collectionItems.purchaseDate,
      purchaseLocation: collectionItems.purchaseLocation,
      releaseId: releases.id,
      masterId: releases.masterId,
      title: releases.title,
      year: releases.year,
      country: releases.country,
      labelName: releases.labelName,
      catalogNumber: releases.catalogNumber,
      coverUrl: releases.coverUrl,
    })
    .from(collectionItems)
    .innerJoin(releases, eq(collectionItems.releaseId, releases.id))
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, userId)))
    .limit(1);
  return item ?? null;
}

/**
 * Repoints a collection item at a different pressing of the same (or a different)
 * release — used by the advanced edition picker. Falls back to a no-op if the user
 * already owns the target pressing (would collide with the unique user/release index).
 */
export async function updateCollectionItemRelease(
  userId: string,
  itemId: number,
  newReleaseId: number,
) {
  const [existing] = await db
    .select({ id: collectionItems.id })
    .from(collectionItems)
    .where(
      and(eq(collectionItems.userId, userId), eq(collectionItems.releaseId, newReleaseId)),
    )
    .limit(1);
  if (existing) {
    throw new Error("You already have this edition in your collection.");
  }

  await db
    .update(collectionItems)
    .set({ releaseId: newReleaseId })
    .where(and(eq(collectionItems.id, itemId), eq(collectionItems.userId, userId)));
}

export type CollectionFilters = {
  genre?: string;
  year?: number;
  label?: string;
};

export async function listCollectionFilterOptions(
  userId: string,
): Promise<CollectionFilterOptions> {
  const rows = await db
    .select({
      genres: releases.genres,
      year: releases.year,
      labelName: releases.labelName,
    })
    .from(collectionItems)
    .innerJoin(releases, eq(collectionItems.releaseId, releases.id))
    .where(eq(collectionItems.userId, userId));

  return buildCollectionFilterOptions(rows);
}

export async function listCollectionItems(
  userId: string,
  filters: CollectionFilters = {},
) {
  const conditions = [eq(collectionItems.userId, userId)];
  if (filters.year) conditions.push(eq(releases.year, filters.year));
  if (filters.label) conditions.push(ilike(releases.labelName, `%${filters.label}%`));
  if (filters.genre) conditions.push(arrayContains(releases.genres, [filters.genre]));

  const rows = await db
    .select({
      itemId: collectionItems.id,
      addedAt: collectionItems.addedAt,
      rating: collectionItems.rating,
      folder: collectionItems.folder,
      releaseId: releases.id,
      title: releases.title,
      year: releases.year,
      country: releases.country,
      coverUrl: releases.coverUrl,
      thumbUrl: releases.thumbUrl,
      genres: releases.genres,
      labelName: releases.labelName,
    })
    .from(collectionItems)
    .innerJoin(releases, eq(collectionItems.releaseId, releases.id))
    .where(and(...conditions))
    .orderBy(desc(collectionItems.addedAt));

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

/** Full catalog details for one release (with ordered artist names), for the album detail page. */
export async function getReleaseById(releaseId: number) {
  const [release] = await db
    .select({
      releaseId: releases.id,
      discogsReleaseId: releases.discogsReleaseId,
      title: releases.title,
      year: releases.year,
      country: releases.country,
      coverUrl: releases.coverUrl,
      thumbUrl: releases.thumbUrl,
      genres: releases.genres,
      styles: releases.styles,
      labelName: releases.labelName,
      catalogNumber: releases.catalogNumber,
    })
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) return null;

  const artistRows = await db
    .select({ artistName: artists.name })
    .from(releaseArtists)
    .innerJoin(artists, eq(releaseArtists.artistId, artists.id))
    .where(eq(releaseArtists.releaseId, releaseId))
    .orderBy(releaseArtists.joinOrder);

  return { ...release, artistNames: artistRows.map((r) => r.artistName) };
}

/** Recent, real album covers for the marketing landing page's vinyl carousel. */
export async function listRecentReleaseCovers(limit: number) {
  const rows = await db
    .select({
      releaseId: releases.id,
      title: releases.title,
      coverUrl: releases.coverUrl,
    })
    .from(releases)
    .where(and(isNotNull(releases.coverUrl), ne(releases.coverUrl, "")))
    .orderBy(desc(releases.fetchedAt))
    .limit(limit);

  return rows as { releaseId: number; title: string; coverUrl: string }[];
}

export async function listPublicCollectionItems(userId: string) {
  const rows = await db
    .select({
      itemId: collectionItems.id,
      addedAt: collectionItems.addedAt,
      releaseId: releases.id,
      title: releases.title,
      year: releases.year,
      country: releases.country,
      coverUrl: releases.coverUrl,
      thumbUrl: releases.thumbUrl,
      genres: releases.genres,
      labelName: releases.labelName,
    })
    .from(collectionItems)
    .innerJoin(releases, eq(collectionItems.releaseId, releases.id))
    .where(eq(collectionItems.userId, userId))
    .orderBy(desc(collectionItems.addedAt));

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

/**
 * Builds a normalized `artist::title` match key. Since Explore cards are raw Last.fm strings
 * with no resolved release id, matching is by text — so we lowercase and strip parenthetical/
 * bracketed suffixes (e.g. "(Remastered)", "[Deluxe Edition]") and punctuation, so
 * "Abbey Road" and "Abbey Road (Remastered)" collapse to the same key.
 */
export function albumMatchKey(artist: string, title: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${normalize(artist)}::${normalize(title)}`;
}

/**
 * Normalized match keys for every artist/title pair across the user's collection ∪ wishlist.
 * Used to hide already-owned/wishlisted albums from the Explore tab.
 */
export async function getLibraryAlbumKeys(userId: string): Promise<Set<string>> {
  const result = await db.execute<{ artist: string; title: string }>(sql`
    select a.name as artist, r.title as title
    from releases r
    join release_artists ra on ra.release_id = r.id
    join artists a on a.id = ra.artist_id
    where r.id in (
      select release_id from collection_items where user_id = ${userId}
      union
      select release_id from wishlist_items where user_id = ${userId}
    )
  `);
  return new Set(result.rows.map((r) => albumMatchKey(r.artist, r.title)));
}
