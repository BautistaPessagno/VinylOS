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
  "collection-added": { message: "Añadido a tu colección", variant: "success" },
  "collection-add-failed": {
    message: "No se pudo añadir a tu colección. Inténtalo de nuevo.",
    variant: "error",
  },
  "wishlist-added": { message: "Añadido a tu lista de deseos", variant: "success" },
  "wishlist-add-failed": {
    message: "No se pudo añadir a tu lista de deseos. Inténtalo de nuevo.",
    variant: "error",
  },
  "wishlist-removed": {
    message: "Eliminado de tu lista de deseos",
    variant: "success",
  },
  "moved-to-collection": { message: "Movido a tu colección", variant: "success" },
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
