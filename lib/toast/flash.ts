import { TOAST_PARAM, type ToastCode } from "./messages";

/**
 * Appends a `?toast=<code>` flash param to an internal redirect path, preserving any
 * existing query string. Non-internal or empty paths are returned unchanged so this can
 * be applied blindly to a computed return path.
 */
export function appendToast(path: string, code: ToastCode): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return path;

  const [pathAndQuery, hash] = path.split("#");
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const withToast = `${pathAndQuery}${separator}${TOAST_PARAM}=${code}`;
  return hash ? `${withToast}#${hash}` : withToast;
}
