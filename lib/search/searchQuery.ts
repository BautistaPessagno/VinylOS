export const MIN_SEARCH_QUERY_LENGTH = 2;

export function normalizeSearchQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isSearchQueryReady(value: string): boolean {
  return normalizeSearchQuery(value).length >= MIN_SEARCH_QUERY_LENGTH;
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
  if (message.startsWith("Discogs rate limit exceeded")) {
    return message;
  }
  return "Search is unavailable right now. Try again.";
}
