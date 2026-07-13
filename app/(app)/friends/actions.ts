"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { appendToast } from "@/lib/toast/flash";
import { followUser, unfollowUser } from "@/lib/services/friendService";

function getSafeReturnPath(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/friends";
  }
  return value;
}

function getTargetUserId(formData: FormData) {
  const value = formData.get("userId");
  return typeof value === "string" ? value : "";
}

export async function followUserAction(formData: FormData) {
  const session = await requireSession();
  const targetUserId = getTargetUserId(formData);

  let code: "followed" | "action-failed" = "followed";
  try {
    await followUser(session.user.id, targetUserId);
  } catch {
    code = "action-failed";
  }

  const returnTo = getSafeReturnPath(formData);
  revalidatePath("/friends");
  revalidatePath(returnTo);
  redirect(appendToast(returnTo, code));
}

export async function unfollowUserAction(formData: FormData) {
  const session = await requireSession();
  const targetUserId = getTargetUserId(formData);

  let code: "unfollowed" | "action-failed" = "unfollowed";
  try {
    await unfollowUser(session.user.id, targetUserId);
  } catch {
    code = "action-failed";
  }

  const returnTo = getSafeReturnPath(formData);
  revalidatePath("/friends");
  revalidatePath(returnTo);
  redirect(appendToast(returnTo, code));
}
