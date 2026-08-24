/**
 * Absolute URL for a site-relative path, using the incoming request host.
 *
 * Distinct from `absoluteUrl()` in site.ts, which always uses the canonical
 * production origin for OG/JSON-LD/sitemaps. Share links should point at the
 * page the user is looking at (localhost, preview, or prod).
 */
export function shareUrlForPath(
  path: string,
  requestHeaders: { get(name: string): string | null },
): string {
  const firstValue = (name: string) =>
    requestHeaders.get(name)?.split(",", 1)[0]?.trim() || undefined;
  const host = firstValue("x-forwarded-host") ?? firstValue("host");
  if (!host) return path;

  const forwardedProtocol = firstValue("x-forwarded-proto");
  if (forwardedProtocol && forwardedProtocol !== "http" && forwardedProtocol !== "https") {
    return path;
  }
  const protocol = forwardedProtocol ?? "http";

  try {
    const origin = new URL(`${protocol}://${host}`);
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
      return path;
    }
    return new URL(path, origin).toString();
  } catch {
    return path;
  }
}
