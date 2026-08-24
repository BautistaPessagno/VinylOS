export type ProfileView = "profile" | "settings" | "wishlist";

export function resolveProfileView(view: string | undefined, isSelf: boolean): ProfileView {
  if (view === "wishlist") return "wishlist";
  if (view === "settings" && isSelf) return "settings";
  return "profile";
}

export function publicProfilePath(userId: string, view: ProfileView): string {
  return view === "wishlist" ? `/users/${userId}?view=wishlist` : `/users/${userId}`;
}
