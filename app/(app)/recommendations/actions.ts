"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { addCollectionItem } from "@/lib/services/collectionService";
import { addWishlistItem } from "@/lib/services/wishlistService";
import * as discogs from "@/lib/discogs/client";
import type {
  DiscogsAlbumGroup,
  DiscogsArtistSearchResult,
  DiscogsSongResult,
} from "@/lib/discogs/types";
import { isSearchQueryReady, normalizeSearchQuery } from "@/lib/search/searchQuery";
import { findBestTrack } from "@/lib/search/rankSearchResults";
import { appendToast } from "@/lib/toast/flash";
import {
  generateRecommendations,
  dismissRecommendation,
  dismissRecommendationForRelease,
  resolveReleaseFromNames,
} from "@/lib/services/recommendationService";

const EXPLORE_RETURN = "/recommendations?tab=explore";

export type ExploreSearchResult = {
  query: string;
  artists: DiscogsArtistSearchResult[];
  albums: DiscogsAlbumGroup[];
  songs: DiscogsSongResult[];
};

const MAX_SONG_RESULTS = 4;

/**
 * Resolves track-search album groups to actual song titles by fetching each
 * release's tracklist. Groups whose tracklist can't be fetched or has no track
 * matching the query are dropped rather than shown with a guessed title.
 */
async function resolveSongResults(
  query: string,
  groups: DiscogsAlbumGroup[],
): Promise<DiscogsSongResult[]> {
  const releases = await Promise.all(
    groups.slice(0, MAX_SONG_RESULTS).map(async (group) => {
      try {
        return { group, release: await discogs.getRelease(group.releaseId) };
      } catch {
        return null;
      }
    }),
  );

  const songs: DiscogsSongResult[] = [];
  for (const entry of releases) {
    if (!entry) continue;
    const track = findBestTrack(query, entry.release.tracklist ?? []);
    if (!track) continue;
    songs.push({
      key: entry.group.key,
      trackTitle: track.title,
      artist: entry.group.artist,
      albumTitle: entry.group.title,
      coverImage: entry.group.coverImage,
      year: entry.group.year,
    });
  }
  return songs;
}

function exploreReturnPath(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return EXPLORE_RETURN;
  }
  return value;
}

export async function refreshRecommendationsAction() {
  const session = await requireSession();
  await generateRecommendations(session.user.id);
  revalidatePath("/recommendations");
}

export async function searchExploreAction(query: string): Promise<ExploreSearchResult> {
  await requireSession();
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) {
    return { query: normalizedQuery, artists: [], albums: [], songs: [] };
  }

  const [artists, albums, trackAlbums] = await Promise.all([
    discogs.searchArtists(normalizedQuery),
    discogs.searchVinylAlbums(normalizedQuery),
    discogs.searchVinylAlbumsByTrack(normalizedQuery),
  ]);
  const songs = await resolveSongResults(normalizedQuery, trackAlbums);
  return { query: normalizedQuery, artists, albums, songs };
}

export async function dismissRecommendationAction(formData: FormData) {
  const session = await requireSession();
  const recId = Number(formData.get("recId"));

  await dismissRecommendation(session.user.id, recId);
  revalidatePath("/recommendations");
  redirect(appendToast("/recommendations", "dismissed"));
}

export async function addRecommendationToCollectionAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  let code: "collection-added" | "collection-add-failed" = "collection-added";
  try {
    // The release is already cached locally from generation, so no Discogs fetch needed.
    await addCollectionItem(session.user.id, releaseId, {}, "manual");
    await dismissRecommendationForRelease(session.user.id, releaseId);
  } catch {
    code = "collection-add-failed";
  }
  revalidatePath("/recommendations");
  revalidatePath("/collection");
  redirect(appendToast("/recommendations", code));
}

/** Resolve an Explore card (Last.fm artist + album) to a release, then add it to the collection. */
export async function addExploreAlbumAction(formData: FormData) {
  const session = await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const returnTo = exploreReturnPath(formData);
  const releaseId = await resolveReleaseFromNames(artist, album);
  if (!releaseId) {
    redirect(appendToast(returnTo, "not-found"));
  }

  let code: "collection-added" | "collection-add-failed" = "collection-added";
  try {
    await addCollectionItem(session.user.id, releaseId, {}, "manual");
    revalidatePath("/collection");
  } catch {
    code = "collection-add-failed";
  }
  redirect(appendToast(returnTo, code));
}

/** Resolve an Explore card to a release, then add it to the wishlist. */
export async function wishlistExploreAlbumAction(formData: FormData) {
  const session = await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const returnTo = exploreReturnPath(formData);
  const releaseId = await resolveReleaseFromNames(artist, album);
  if (!releaseId) {
    redirect(appendToast(returnTo, "not-found"));
  }

  let code: "wishlist-added" | "wishlist-add-failed" = "wishlist-added";
  try {
    await addWishlistItem(session.user.id, releaseId);
    revalidatePath("/wishlist");
  } catch {
    code = "wishlist-add-failed";
  }
  redirect(appendToast(returnTo, code));
}

/** Resolve an Explore card to a release, then open its detail page. */
export async function openExploreAlbumAction(formData: FormData) {
  await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const releaseId = await resolveReleaseFromNames(artist, album);
  const returnTo = exploreReturnPath(formData);
  redirect(
    releaseId ? `/album/${releaseId}?from=${encodeURIComponent(returnTo)}` : returnTo,
  );
}
