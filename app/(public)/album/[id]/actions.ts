"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { appendToast } from "@/lib/toast/flash";
import type { LibraryActionResult } from "@/lib/toast/messages";
import { addCollectionItem } from "@/lib/services/collectionService";
import {
  dismissReleaseForUser,
  dismissRecommendationForRelease,
} from "@/lib/services/recommendationService";

function safeReturnPath(formData: FormData, fallback: string) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

/**
 * Add this album to the collection from its detail page, without leaving it.
 * `/collection` is a dynamic route, so it reads fresh when the toast link is followed
 * and there is nothing here worth revalidating.
 */
export async function addAlbumToCollectionAction(
  _previous: LibraryActionResult | null,
  formData: FormData,
): Promise<LibraryActionResult> {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));
  if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
    return { toast: "collection-add-failed", inList: false };
  }

  let itemId: number | null;
  try {
    itemId = await addCollectionItem(session.user.id, releaseId, {}, "manual");
  } catch {
    return { toast: "collection-add-failed", inList: false };
  }

  try {
    await dismissRecommendationForRelease(session.user.id, releaseId);
  } catch {
    // The add already succeeded. Library membership filters the stale recommendation.
  }
  return {
    toast: itemId ? "collection-added" : "collection-already",
    inList: true,
  };
}

/** Mark this album as "not interested" so it won't resurface in recommendations. */
export async function dismissAlbumAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  await dismissReleaseForUser(session.user.id, releaseId);
  revalidatePath("/recommendations");
  redirect(appendToast(safeReturnPath(formData, "/recommendations"), "dismissed"));
}
