"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { appendToast } from "@/lib/toast/flash";
import * as discogs from "@/lib/discogs/client";
import { releaseInputFromDiscogs } from "@/lib/discogs/mapRelease";
import { upsertRelease, addCollectionItem } from "@/lib/services/collectionService";
import { addWishlistItem, removeWishlistItem } from "@/lib/services/wishlistService";

function getSafeReturnPath(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/wishlist";
  }
  return value;
}

/**
 * Add a release (already cached locally) to the wishlist and return to the page
 * the button was clicked from. Used by the recommendations and public-profile pages.
 */
export async function addReleaseToWishlistAction(formData: FormData) {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));

  let code: "wishlist-added" | "wishlist-add-failed" = "wishlist-added";
  try {
    await addWishlistItem(session.user.id, releaseId);
  } catch {
    code = "wishlist-add-failed";
  }

  const returnTo = getSafeReturnPath(formData);
  revalidatePath(returnTo);
  revalidatePath("/wishlist");
  redirect(appendToast(returnTo, code));
}

/** One-click wishlist from Discogs search: fetches the pressing, caches it, then wishlists it. */
export async function addAlbumToWishlistFromDiscogsAction(discogsReleaseId: number) {
  const session = await requireSession();
  const detail = await discogs.getRelease(discogsReleaseId);
  const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
  await addWishlistItem(session.user.id, releaseId);
  revalidatePath("/wishlist");
  redirect(appendToast("/wishlist", "wishlist-added"));
}

export async function removeFromWishlistAction(formData: FormData) {
  const session = await requireSession();
  const itemId = Number(formData.get("itemId"));

  await removeWishlistItem(session.user.id, itemId);
  revalidatePath("/wishlist");
  redirect(appendToast("/wishlist", "wishlist-removed"));
}

/** Move a wishlisted record into the collection (e.g. once purchased). */
export async function moveToCollectionAction(formData: FormData) {
  const session = await requireSession();
  const itemId = Number(formData.get("itemId"));
  const releaseId = Number(formData.get("releaseId"));

  let code: "moved-to-collection" | "action-failed" = "moved-to-collection";
  try {
    await addCollectionItem(session.user.id, releaseId, {}, "manual");
    await removeWishlistItem(session.user.id, itemId);
  } catch {
    code = "action-failed";
  }
  revalidatePath("/wishlist");
  revalidatePath("/collection");
  redirect(appendToast("/wishlist", code));
}
