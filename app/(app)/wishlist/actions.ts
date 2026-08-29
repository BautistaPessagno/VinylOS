"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { appendToast } from "@/lib/toast/flash";
import type { LibraryActionResult } from "@/lib/toast/messages";
import * as discogs from "@/lib/discogs/client";
import { releaseInputFromDiscogs } from "@/lib/discogs/mapRelease";
import { upsertRelease, addCollectionItem } from "@/lib/services/collectionService";
import { addWishlistItem, removeWishlistItem } from "@/lib/services/wishlistService";

/**
 * Add a release (already cached locally) to the wishlist without moving the user.
 *
 * Deliberately revalidates nothing: any revalidation would make Next re-render the
 * page the click came from, and a discovery grid that filters out wishlisted records
 * would pull the card out from under the tap. `/wishlist` is a dynamic route, so it
 * reads fresh whenever the user follows the toast link there.
 */
export async function addReleaseToWishlistAction(
  _previous: LibraryActionResult | null,
  formData: FormData,
): Promise<LibraryActionResult> {
  const session = await requireSession();
  const releaseId = Number(formData.get("releaseId"));
  if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
    return { toast: "wishlist-add-failed", inList: false };
  }

  try {
    const itemId = await addWishlistItem(session.user.id, releaseId);
    return { toast: itemId ? "wishlist-added" : "wishlist-already", inList: true };
  } catch {
    return { toast: "wishlist-add-failed", inList: false };
  }
}

/** One-click wishlist from Discogs search: fetches the pressing, caches it, then wishlists it. */
export async function addAlbumToWishlistFromDiscogsAction(
  discogsReleaseId: number,
): Promise<LibraryActionResult> {
  const session = await requireSession();
  if (!Number.isSafeInteger(discogsReleaseId) || discogsReleaseId <= 0) {
    return { toast: "wishlist-add-failed", inList: false };
  }
  try {
    const detail = await discogs.getRelease(discogsReleaseId);
    const releaseId = await upsertRelease(releaseInputFromDiscogs(detail));
    const itemId = await addWishlistItem(session.user.id, releaseId);
    return { toast: itemId ? "wishlist-added" : "wishlist-already", inList: true };
  } catch {
    return { toast: "wishlist-add-failed", inList: false };
  }
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
