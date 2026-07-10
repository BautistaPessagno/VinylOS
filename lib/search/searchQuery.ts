export const MIN_SEARCH_QUERY_LENGTH = 2;

export function normalizeSearchQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
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
