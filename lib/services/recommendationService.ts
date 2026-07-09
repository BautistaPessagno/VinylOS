import { db } from "@/lib/db/client";
import {
  releases,
  artists,
  releaseArtists,
  collectionItems,
  recommendations,
  artistSimilarity,
} from "@/lib/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import * as discogs from "@/lib/discogs/client";
import { getSimilarArtists } from "@/lib/lastfm/client";
import { upsertRelease } from "@/lib/services/collectionService";
import type { DiscogsRelease } from "@/lib/discogs/types";

// Rate-limit caps: the Discogs client has no backoff, only a 429 throw, so we
// bound how many detail lookups a single generation run can make.
const MAX_COOCCURRENCE_CANDIDATES = 20;
const MAX_SIMILAR_ARTIST_SEEDS = 8;
const MAX_SIMILAR_ARTIST_LOOKUPS = 15;
const MAX_PERSISTED_RECOMMENDATIONS = 40;

function releaseInputFromDiscogs(detail: DiscogsRelease) {
  return {
    discogsReleaseId: detail.id,
    masterId: detail.master_id,
    title: detail.title,
    artistNames: detail.artists?.map((a) => a.name) ?? [],
    year: detail.year,
    country: detail.country,
    labelName: detail.labels?.[0]?.name,
    catalogNumber: detail.labels?.[0]?.catno,
    genres: detail.genres ?? [],
    styles: detail.styles ?? [],
    coverUrl: detail.images?.[0]?.uri ?? "",
    thumbUrl: detail.images?.[0]?.uri ?? "",
  };
}

type Candidate = {
  releaseId: number;
  score: number;
  source: "discogs_cooccurrence" | "lastfm_similar";
  reason: string;
};

async function getCollectionProfile(userId: string) {
  const [ownedRows, genreRows, styleRows, labelRows, artistRows] = await Promise.all([
    db
      .select({ releaseId: releases.id, discogsReleaseId: releases.discogsReleaseId })
      .from(collectionItems)
      .innerJoin(releases, eq(collectionItems.releaseId, releases.id))
      .where(eq(collectionItems.userId, userId)),
    db.execute<{ genre: string; count: number }>(sql`
      select genre, count(*)::int as count
      from collection_items ci
      join releases r on r.id = ci.release_id
      cross join lateral unnest(r.genres) as genre
      where ci.user_id = ${userId}
      group by genre
      order by count desc
      limit 5
    `),
    db.execute<{ style: string; count: number }>(sql`
      select style, count(*)::int as count
      from collection_items ci
      join releases r on r.id = ci.release_id
      cross join lateral unnest(r.styles) as style
      where ci.user_id = ${userId}
      group by style
      order by count desc
      limit 5
    `),
    db.execute<{ label: string; count: number }>(sql`
      select r.label_name as label, count(*)::int as count
      from collection_items ci
      join releases r on r.id = ci.release_id
      where ci.user_id = ${userId} and r.label_name is not null
      group by r.label_name
      order by count desc
      limit 3
    `),
    db.execute<{ artist: string; count: number }>(sql`
      select a.name as artist, count(*)::int as count
      from collection_items ci
      join release_artists ra on ra.release_id = ci.release_id
      join artists a on a.id = ra.artist_id
      where ci.user_id = ${userId}
      group by a.name
      order by count desc
      limit 10
    `),
  ]);

  return {
    ownedReleaseIds: new Set(ownedRows.map((r) => r.releaseId)),
    ownedDiscogsReleaseIds: new Set(
      ownedRows.map((r) => r.discogsReleaseId).filter((id): id is number => id != null),
    ),
    ownedArtistNames: new Set(artistRows.rows.map((r) => r.artist.toLowerCase())),
    topGenres: genreRows.rows.map((r) => r.genre),
    topStyles: styleRows.rows.map((r) => r.style),
    topLabels: labelRows.rows.map((r) => r.label),
    topArtists: artistRows.rows.map((r) => r.artist),
  };
}

async function findCooccurrenceCandidates(
  profile: Awaited<ReturnType<typeof getCollectionProfile>>,
) {
  const queries = [
    ...profile.topStyles,
    ...(profile.topStyles.length === 0 ? profile.topGenres : []),
    ...profile.topLabels,
  ];

  // discogsReleaseId -> accumulated score + first matched query (for the reason).
  const scored = new Map<number, { score: number; reason: string }>();

  for (const query of queries) {
    if (!query) continue;
    let results;
    try {
      results = await discogs.searchReleases(query);
    } catch {
      continue; // one failing lookup shouldn't abort the whole run
    }
    for (const r of results) {
      if (profile.ownedDiscogsReleaseIds.has(r.id)) continue;
      const existing = scored.get(r.id);
      if (existing) {
        existing.score += 1;
      } else {
        scored.set(r.id, { score: 1, reason: `Matches your "${query}" records` });
      }
    }
  }

  const topDiscogsIds = [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_COOCCURRENCE_CANDIDATES)
    .map(([discogsReleaseId, info]) => ({ discogsReleaseId, ...info }));

  const candidates: Candidate[] = [];
  for (const { discogsReleaseId, score, reason } of topDiscogsIds) {
    try {
      const detail = await discogs.getRelease(discogsReleaseId);
      const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
      candidates.push({ releaseId, score, source: "discogs_cooccurrence", reason });
    } catch {
      continue;
    }
  }
  return candidates;
}

async function cacheSimilarArtists(artistName: string, similar: { name: string; match: number }[]) {
  if (similar.length === 0) return;
  await db
    .insert(artistSimilarity)
    .values(
      similar.map((s) => ({
        artistName,
        similarArtistName: s.name,
        matchScore: s.match.toString(),
      })),
    )
    .onConflictDoUpdate({
      target: [artistSimilarity.artistName, artistSimilarity.similarArtistName],
      set: { fetchedAt: new Date() },
    });
}

async function findLastfmCandidates(
  profile: Awaited<ReturnType<typeof getCollectionProfile>>,
) {
  const seedArtists = profile.topArtists.slice(0, MAX_SIMILAR_ARTIST_SEEDS);

  // similarArtistName -> best { score, reason }
  const similarByName = new Map<string, { score: number; reason: string }>();
  for (const seedArtist of seedArtists) {
    let similar;
    try {
      similar = await getSimilarArtists(seedArtist);
    } catch {
      continue;
    }
    await cacheSimilarArtists(seedArtist, similar);
    for (const s of similar) {
      if (profile.ownedArtistNames.has(s.name.toLowerCase())) continue;
      const existing = similarByName.get(s.name);
      const score = s.match * 5;
      if (!existing || score > existing.score) {
        similarByName.set(s.name, { score, reason: `Because you like ${seedArtist}` });
      }
    }
  }

  const topSimilar = [...similarByName.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_SIMILAR_ARTIST_LOOKUPS);

  const candidates: Candidate[] = [];
  for (const [artistName, { score, reason }] of topSimilar) {
    try {
      const groups = await discogs.searchVinylAlbums(artistName);
      const top = groups[0];
      if (!top) continue;
      if (profile.ownedDiscogsReleaseIds.has(top.releaseId)) continue;
      const detail = await discogs.getRelease(top.releaseId);
      const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
      candidates.push({ releaseId, score, source: "lastfm_similar", reason });
    } catch {
      continue;
    }
  }
  return candidates;
}

export async function generateRecommendations(userId: string) {
  const profile = await getCollectionProfile(userId);

  const dismissedRows = await db
    .select({ releaseId: recommendations.releaseId })
    .from(recommendations)
    .where(and(eq(recommendations.userId, userId), eq(recommendations.dismissed, true)));
  const dismissedReleaseIds = new Set(dismissedRows.map((r) => r.releaseId));

  const [cooccurrence, lastfm] = await Promise.all([
    findCooccurrenceCandidates(profile),
    findLastfmCandidates(profile),
  ]);

  // Combine both signals, deduping by release: sum scores, keep the reason
  // from whichever signal contributed the larger share.
  const combined = new Map<number, Candidate>();
  for (const candidate of [...cooccurrence, ...lastfm]) {
    if (profile.ownedReleaseIds.has(candidate.releaseId)) continue;
    if (dismissedReleaseIds.has(candidate.releaseId)) continue;
    const existing = combined.get(candidate.releaseId);
    if (!existing) {
      combined.set(candidate.releaseId, { ...candidate });
    } else if (candidate.score > existing.score) {
      combined.set(candidate.releaseId, {
        ...candidate,
        score: existing.score + candidate.score,
      });
    } else {
      existing.score += candidate.score;
    }
  }

  const finalCandidates = [...combined.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PERSISTED_RECOMMENDATIONS);

  await db.transaction(async (tx) => {
    await tx
      .delete(recommendations)
      .where(and(eq(recommendations.userId, userId), eq(recommendations.dismissed, false)));

    if (finalCandidates.length > 0) {
      await tx.insert(recommendations).values(
        finalCandidates.map((c) => ({
          userId,
          releaseId: c.releaseId,
          score: c.score.toString(),
          source: c.source,
          reason: c.reason,
        })),
      );
    }
  });
}

export async function listRecommendations(userId: string) {
  const rows = await db
    .select({
      recId: recommendations.id,
      releaseId: releases.id,
      title: releases.title,
      year: releases.year,
      coverUrl: releases.coverUrl,
      thumbUrl: releases.thumbUrl,
      reason: recommendations.reason,
      score: recommendations.score,
    })
    .from(recommendations)
    .innerJoin(releases, eq(recommendations.releaseId, releases.id))
    .where(and(eq(recommendations.userId, userId), eq(recommendations.dismissed, false)))
    .orderBy(desc(recommendations.score));

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

export async function dismissRecommendation(userId: string, recId: number) {
  await db
    .update(recommendations)
    .set({ dismissed: true })
    .where(and(eq(recommendations.id, recId), eq(recommendations.userId, userId)));
}

/** Marks the recommendation for `releaseId` as dismissed once the user has added it. */
export async function dismissRecommendationForRelease(userId: string, releaseId: number) {
  await db
    .update(recommendations)
    .set({ dismissed: true })
    .where(
      and(eq(recommendations.userId, userId), eq(recommendations.releaseId, releaseId)),
    );
}
