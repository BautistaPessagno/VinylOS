"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import * as discogs from "@/lib/discogs/client";
import { releaseInputFromDiscogs } from "@/lib/discogs/mapRelease";
import { isSearchQueryReady, normalizeSearchQuery } from "@/lib/search/searchQuery";
import { appendToast } from "@/lib/toast/flash";
import type { LibraryActionResult } from "@/lib/toast/messages";
import {
  upsertRelease,
  addCollectionItem,
  getLibraryDiscogsReleaseIds,
  updateCollectionItem,
  updateCollectionItemRelease,
  removeCollectionItem,
  getCollectionItem,
} from "@/lib/services/collectionService";
import {
  releaseFormSchema,
  collectionItemFormSchema,
} from "@/lib/validation/collectionItem";

export type DiscogsCollectionSearchResult = {
  albums: Awaited<ReturnType<typeof discogs.searchVinylAlbums>>;
  library: { collection: number[]; wishlist: number[] };
};

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

const MAX_BATCH_ADD_COUNT = 50;

export async function searchDiscogsAction(
  query: string,
): Promise<DiscogsCollectionSearchResult> {
  const session = await requireSession();
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) {
    return { albums: [], library: { collection: [], wishlist: [] } };
  }

  const albums = await discogs.searchVinylAlbums(normalizedQuery);
  const library = await getLibraryDiscogsReleaseIds(
    session.user.id,
    albums.map((album) => album.releaseId),
  );
  return {
    albums,
    library: {
      collection: [...library.collection],
      wishlist: [...library.wishlist],
    },
  };
}

export async function getAlbumEditionsAction(masterId: number) {
  await requireSession();
  return discogs.getMasterVersions(masterId);
}

/**
 * One-click add: fetches the chosen pressing and saves it straight to the collection,
 * leaving the user on the search results so they can keep adding. Revalidating anything
 * here would re-render this page and throw away the in-progress search.
 */
export async function addAlbumFromDiscogsAction(
  discogsReleaseId: number,
): Promise<LibraryActionResult> {
  const session = await requireSession();
  try {
    if (!isPositiveInteger(discogsReleaseId)) throw new Error("Invalid release id");
    const detail = await discogs.getRelease(discogsReleaseId);
    const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
    const itemId = await addCollectionItem(
      session.user.id,
      releaseId,
      {},
      "discogs_sync",
    );
    return {
      toast: itemId ? "collection-added" : "collection-already",
      inList: true,
    };
  } catch {
    return { toast: "collection-add-failed", inList: false };
  }
}

/** Multi-select add: adds each chosen album's default pressing in one batch. */
export async function addAlbumsFromDiscogsAction(
  discogsReleaseIds: number[],
): Promise<LibraryActionResult> {
  const session = await requireSession();
  try {
    const uniqueReleaseIds = [...new Set(discogsReleaseIds)];
    if (
      uniqueReleaseIds.length === 0 ||
      discogsReleaseIds.length > MAX_BATCH_ADD_COUNT ||
      uniqueReleaseIds.some((id) => !isPositiveInteger(id))
    ) {
      throw new Error("Invalid release ids");
    }

    let addedAny = false;
    for (const discogsReleaseId of uniqueReleaseIds) {
      const detail = await discogs.getRelease(discogsReleaseId);
      const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
      const itemId = await addCollectionItem(
        session.user.id,
        releaseId,
        {},
        "discogs_sync",
      );
      addedAny ||= itemId !== null;
    }
    return {
      toast: addedAny ? "collection-added" : "collection-already",
      inList: true,
    };
  } catch {
    return { toast: "collection-add-failed", inList: false };
  }
}

/** Advanced edition picker on the edit page: swap an owned item to a different pressing. */
export async function changeItemEditionAction(itemId: number, discogsReleaseId: number) {
  const session = await requireSession();
  const detail = await discogs.getRelease(discogsReleaseId);
  const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
  await updateCollectionItemRelease(session.user.id, itemId, releaseId);
  revalidatePath("/collection");
  revalidatePath(`/collection/${itemId}/edit`);
}

function parseItemInput(formData: FormData) {
  return collectionItemFormSchema.parse({
    rating: formData.get("rating") || undefined,
    notes: formData.get("notes") || undefined,
    folder: formData.get("folder") || undefined,
    mediaCondition: formData.get("mediaCondition") || undefined,
    sleeveCondition: formData.get("sleeveCondition") || undefined,
    purchasePrice: formData.get("purchasePrice") || undefined,
    purchaseDate: formData.get("purchaseDate") || "",
    purchaseLocation: formData.get("purchaseLocation") || undefined,
  });
}

export async function submitAddReleaseAction(formData: FormData) {
  const session = await requireSession();
  const itemInput = parseItemInput(formData);

  const releaseInput = releaseFormSchema.parse({
    discogsReleaseId: formData.get("discogsReleaseId") || undefined,
    title: formData.get("title"),
    artistNames: formData.get("artistNames"),
    year: formData.get("year") || undefined,
    country: formData.get("country") || undefined,
    labelName: formData.get("labelName") || undefined,
    catalogNumber: formData.get("catalogNumber") || undefined,
    genres: formData.get("genres") || undefined,
    styles: formData.get("styles") || undefined,
    coverUrl: formData.get("coverUrl") || "",
    thumbUrl: formData.get("thumbUrl") || "",
  });

  const releaseId = await upsertRelease(releaseInput);
  const source: "manual" | "discogs_sync" = releaseInput.discogsReleaseId
    ? "discogs_sync"
    : "manual";

  await addCollectionItem(session.user.id, releaseId, itemInput, source);
  revalidatePath("/collection");
  redirect(appendToast("/collection", "collection-added"));
}

export async function updateItemAction(formData: FormData) {
  const session = await requireSession();
  const itemId = Number(formData.get("itemId"));
  const itemInput = parseItemInput(formData);

  await updateCollectionItem(session.user.id, itemId, itemInput);
  revalidatePath("/collection");
  redirect("/collection");
}

export async function removeItemAction(formData: FormData) {
  const session = await requireSession();
  const itemId = Number(formData.get("itemId"));

  await removeCollectionItem(session.user.id, itemId);
  revalidatePath("/collection");
  redirect(appendToast("/collection", "item-removed"));
}

export async function getEditItemData(itemId: number) {
  const session = await requireSession();
  return getCollectionItem(session.user.id, itemId);
}
