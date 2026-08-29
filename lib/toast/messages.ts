export const TOAST_PARAM = "toast";

export type ToastVariant = "success" | "error";

/** Optional "you can go there now" link rendered inside the toast. */
export type ToastAction = { href: string; label: string };

export type ToastMessage = {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

const VIEW_COLLECTION: ToastAction = { href: "/collection", label: "Ver colección" };
const VIEW_WISHLIST: ToastAction = {
  href: "/wishlist",
  label: "Ver lista de deseos",
};

/**
 * Short codes carried in the `?toast=` flash param after a server action redirects,
 * and returned directly by the in-place add/wishlist actions.
 * `FlashToaster` maps the code to a message and shows it, then strips the param.
 */
export const TOAST_MESSAGES = {
  "collection-added": {
    message: "Añadido a tu colección",
    variant: "success",
    action: VIEW_COLLECTION,
  },
  "collection-already": {
    message: "Ya estaba en tu colección",
    variant: "success",
    action: VIEW_COLLECTION,
  },
  "collection-add-failed": {
    message: "No se pudo añadir a tu colección. Inténtalo de nuevo.",
    variant: "error",
  },
  "wishlist-added": {
    message: "Añadido a tu lista de deseos",
    variant: "success",
    action: VIEW_WISHLIST,
  },
  "wishlist-already": {
    message: "Ya estaba en tu lista de deseos",
    variant: "success",
    action: VIEW_WISHLIST,
  },
  "wishlist-add-failed": {
    message: "No se pudo añadir a tu lista de deseos. Inténtalo de nuevo.",
    variant: "error",
  },
  "wishlist-removed": {
    message: "Eliminado de tu lista de deseos",
    variant: "success",
  },
  "moved-to-collection": {
    message: "Movido a tu colección",
    variant: "success",
    action: VIEW_COLLECTION,
  },
  "item-removed": { message: "Eliminado de tu colección", variant: "success" },
  dismissed: { message: "No volveremos a recomendarlo", variant: "success" },
  followed: { message: "Siguiendo", variant: "success" },
  unfollowed: { message: "Dejaste de seguir", variant: "success" },
  "not-found": {
    message: "No encontramos ese disco en Discogs.",
    variant: "error",
  },
  "pending-action-expired": {
    message: "Esa acción caducó. Inténtalo de nuevo.",
    variant: "error",
  },
  "action-failed": {
    message: "Algo salió mal. Inténtalo de nuevo.",
    variant: "error",
  },
} as const satisfies Record<string, ToastMessage>;

export type ToastCode = keyof typeof TOAST_MESSAGES;

export function isToastCode(value: string): value is ToastCode {
  return Object.prototype.hasOwnProperty.call(TOAST_MESSAGES, value);
}

/**
 * What an in-place add/wishlist server action hands back instead of redirecting:
 * the toast to show, plus whether the record ended up in the target list (true both
 * for a fresh add and for one that was already there) so the button can retire itself.
 */
export type LibraryActionResult = { toast: ToastCode; inList: boolean };
