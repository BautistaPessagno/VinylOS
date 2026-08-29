/**
 * Builds a normalized `artist::title` match key. Since Explore cards are raw Last.fm strings
 * with no resolved release id, matching is by text — so we lowercase and strip parenthetical/
 * bracketed suffixes (e.g. "(Remastered)", "[Deluxe Edition]") and punctuation, so
 * "Abbey Road" and "Abbey Road (Remastered)" collapse to the same key.
 *
 * Kept free of database imports so client-rendered result grids can match against it too.
 */
export function albumMatchKey(artist: string, title: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${normalize(artist)}::${normalize(title)}`;
}
