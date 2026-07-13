export const TOAST_PARAM = "toast";

export type ToastVariant = "success" | "error";

export type ToastMessage = {
  message: string;
  variant: ToastVariant;
};

/**
 * Short codes carried in the `?toast=` flash param after a server action redirects.
 * `FlashToaster` maps the code to a message and shows it, then strips the param.
 */
export const TOAST_MESSAGES = {
  "collection-added": { message: "Added to your collection", variant: "success" },
  "collection-add-failed": {
    message: "Couldn't add to your collection. Try again.",
    variant: "error",
  },
  "wishlist-added": { message: "Added to your wishlist", variant: "success" },
  "wishlist-add-failed": {
    message: "Couldn't add to your wishlist. Try again.",
    variant: "error",
  },
  "wishlist-removed": { message: "Removed from your wishlist", variant: "success" },
  "moved-to-collection": { message: "Moved to your collection", variant: "success" },
  "item-removed": { message: "Removed from your collection", variant: "success" },
  dismissed: { message: "We won't recommend that again", variant: "success" },
  followed: { message: "Following", variant: "success" },
  unfollowed: { message: "Unfollowed", variant: "success" },
  "not-found": {
    message: "We couldn't find that record on Discogs.",
    variant: "error",
  },
  "action-failed": { message: "Something went wrong. Try again.", variant: "error" },
} as const satisfies Record<string, ToastMessage>;

export type ToastCode = keyof typeof TOAST_MESSAGES;

export function isToastCode(value: string): value is ToastCode {
  return Object.prototype.hasOwnProperty.call(TOAST_MESSAGES, value);
}
