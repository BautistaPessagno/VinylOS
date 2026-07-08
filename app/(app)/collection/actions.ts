"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import * as discogs from "@/lib/discogs/client";
import { getArtistInfo } from "@/lib/lastfm/client";
import {
  upsertRelease,
  addCollectionItem,
  updateCollectionItem,
  removeCollectionItem,
  getCollectionItem,
} from "@/lib/services/collectionService";
import {
  releaseFormSchema,
  collectionItemFormSchema,
} from "@/lib/validation/collectionItem";

export async function searchDiscogsAction(query: string) {
  await requireSession();
  if (!query.trim()) return [];
  return discogs.searchReleases(query);
}

export async function getDiscogsReleaseDetailAction(discogsReleaseId: number) {
  await requireSession();
  const detail = await discogs.getRelease(discogsReleaseId);
  const primaryArtist = detail.artists?.[0]?.name;
  const artistBio = primaryArtist
    ? await getArtistInfo(primaryArtist).catch(() => null)
    : null;
  return { detail, artistBio };
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
  redirect("/collection");
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
}

export async function getEditItemData(itemId: number) {
  const session = await requireSession();
  return getCollectionItem(session.user.id, itemId);
}
