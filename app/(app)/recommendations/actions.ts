"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { addCollectionItem } from "@/lib/services/collectionService";
import {
  generateRecommendations,
  dismissRecommendation,
  dismissRecommendationForRelease,
} from "@/lib/services/recommendationService";

export async function refreshRecommendationsAction() {
  const session = await requireSession();
  await generateRecommendations(session.user.id);
  revalidatePath("/recommendations");
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
