"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
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

/** Add this album to the collection from its detail page. */
export async function addAlbumToCollectionAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  await addCollectionItem(session.user.id, releaseId, {}, "manual");
  await dismissRecommendationForRelease(session.user.id, releaseId);
  revalidatePath("/collection");
  redirect(safeReturnPath(formData, `/album/${releaseId}`));
}

/** Mark this album as "not interested" so it won't resurface in recommendations. */
export async function dismissAlbumAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  await dismissReleaseForUser(session.user.id, releaseId);
  revalidatePath("/recommendations");
  redirect(safeReturnPath(formData, "/recommendations"));
}
