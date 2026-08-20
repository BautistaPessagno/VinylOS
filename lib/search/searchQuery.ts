export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_SEARCH_QUERY_LENGTH = 100;

export function normalizeSearchQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isSearchQueryReady(value: string): boolean {
  const length = normalizeSearchQuery(value).length;
  return length >= MIN_SEARCH_QUERY_LENGTH && length <= MAX_SEARCH_QUERY_LENGTH;
}

export function isLatestSearchRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}

export function searchErrorMessage(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  // Must track the message thrown by lib/discogs/client.ts — rate-limit guidance
  // is the one upstream error worth showing verbatim.
  if (message.startsWith("Se superó el límite de peticiones de Discogs")) {
    return message;
  }
  return "La búsqueda no está disponible ahora mismo. Inténtalo de nuevo.";
}
