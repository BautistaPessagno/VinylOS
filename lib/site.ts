/**
 * Canonical origin for every absolute URL we emit: metadata, sitemap, JSON-LD.
 *
 * Hard-coded fallback rather than VERCEL_URL, because preview deployments must
 * not advertise their own hostname as canonical.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misvinilos.com";

export const SITE_NAME = "VinylOS";

export const SITE_DESCRIPTION =
  "Registra tu colección de vinilos, mira tus estadísticas y descubre qué comprar después.";

/** Absolute URL for a site-relative path, for use in sitemaps and JSON-LD. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
