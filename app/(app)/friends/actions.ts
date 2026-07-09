"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
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

  await followUser(session.user.id, targetUserId);

  const returnTo = getSafeReturnPath(formData);
  revalidatePath("/friends");
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function unfollowUserAction(formData: FormData) {
  const session = await requireSession();
  const targetUserId = getTargetUserId(formData);

  await unfollowUser(session.user.id, targetUserId);

  const returnTo = getSafeReturnPath(formData);
  revalidatePath("/friends");
  revalidatePath(returnTo);
  redirect(returnTo);
}
