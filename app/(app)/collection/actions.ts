"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import * as discogs from "@/lib/discogs/client";
import { releaseInputFromDiscogs } from "@/lib/discogs/mapRelease";
import { isSearchQueryReady, normalizeSearchQuery } from "@/lib/search/searchQuery";
import { appendToast } from "@/lib/toast/flash";
import {
  upsertRelease,
  addCollectionItem,
  updateCollectionItem,
  updateCollectionItemRelease,
  removeCollectionItem,
  getCollectionItem,
} from "@/lib/services/collectionService";
import {
  releaseFormSchema,
  collectionItemFormSchema,
} from "@/lib/validation/collectionItem";

export async function searchDiscogsAction(query: string) {
  await requireSession();
  const normalizedQuery = normalizeSearchQuery(query);
  if (!isSearchQueryReady(normalizedQuery)) return [];
  return discogs.searchVinylAlbums(normalizedQuery);
}

export async function getAlbumEditionsAction(masterId: number) {
  await requireSession();
  return discogs.getMasterVersions(masterId);
}

/** One-click add: fetches the chosen pressing and saves it straight to the collection. */
export async function addAlbumFromDiscogsAction(discogsReleaseId: number) {
  const session = await requireSession();
  const detail = await discogs.getRelease(discogsReleaseId);
  const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
  await addCollectionItem(session.user.id, releaseId, {}, "discogs_sync");
  revalidatePath("/collection");
  redirect(appendToast("/collection", "collection-added"));
}

/** Multi-select add: adds each chosen album's default pressing in one batch. */
export async function addAlbumsFromDiscogsAction(discogsReleaseIds: number[]) {
  const session = await requireSession();
  for (const discogsReleaseId of discogsReleaseIds) {
    const detail = await discogs.getRelease(discogsReleaseId);
    const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
    await addCollectionItem(session.user.id, releaseId, {}, "discogs_sync");
  }
  revalidatePath("/collection");
  redirect(appendToast("/collection", "collection-added"));
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
