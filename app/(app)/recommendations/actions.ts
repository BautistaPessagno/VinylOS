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
} from "@/lib/discogs/types";
import { isSearchQueryReady, normalizeSearchQuery } from "@/lib/search/searchQuery";
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
};

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
    return { query: normalizedQuery, artists: [], albums: [] };
  }

  const [artists, albums] = await Promise.all([
    discogs.searchArtists(normalizedQuery),
    discogs.searchVinylAlbums(normalizedQuery),
  ]);
  return { query: normalizedQuery, artists, albums };
}

export async function dismissRecommendationAction(formData: FormData) {
  const session = await requireSession();
  const recId = Number(formData.get("recId"));

  await dismissRecommendation(session.user.id, recId);
  revalidatePath("/recommendations");
}

export async function addRecommendationToCollectionAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  // The release is already cached locally from generation, so no Discogs fetch needed.
  await addCollectionItem(session.user.id, releaseId, {}, "manual");
  await dismissRecommendationForRelease(session.user.id, releaseId);
  revalidatePath("/recommendations");
  revalidatePath("/collection");
}

/** Resolve an Explore card (Last.fm artist + album) to a release, then add it to the collection. */
export async function addExploreAlbumAction(formData: FormData) {
  const session = await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const releaseId = await resolveReleaseFromNames(artist, album);
  if (releaseId) {
    await addCollectionItem(session.user.id, releaseId, {}, "manual");
    revalidatePath("/collection");
  }
  redirect(exploreReturnPath(formData));
}

/** Resolve an Explore card to a release, then add it to the wishlist. */
export async function wishlistExploreAlbumAction(formData: FormData) {
  const session = await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const releaseId = await resolveReleaseFromNames(artist, album);
  if (releaseId) {
    await addWishlistItem(session.user.id, releaseId);
    revalidatePath("/wishlist");
  }
  redirect(exploreReturnPath(formData));
}

/** Resolve an Explore card to a release, then open its detail page. */
export async function openExploreAlbumAction(formData: FormData) {
  await requireSession();
  const artist = String(formData.get("artist") ?? "");
  const album = String(formData.get("album") ?? "");

  const releaseId = await resolveReleaseFromNames(artist, album);
  redirect(releaseId ? `/album/${releaseId}` : exploreReturnPath(formData));
}
