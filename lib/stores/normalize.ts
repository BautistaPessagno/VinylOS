/** Lowercase, diacritic-free, whitespace-collapsed form used for comparison and slugs. */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    // Combining diacritical marks. Written as escapes so the range survives copy-paste.
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(name: string, neighborhood: string): string {
  return `${foldName(name)} ${foldName(neighborhood)}`
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Argentine numbers to E.164. Returns null when the input lacks an area code,
 * because guessing one silently produces a number that does not ring.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[\s\-().]/g, "");
  if (!compact) return null;

  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("54")) digits = compact;
  else if (compact.startsWith("0")) digits = `54${compact.slice(1)}`;
  else return null;

  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < 11 || digits.length > 14) return null;
  return `+${digits}`;
}

export function instagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const urlMatch = value.match(
    /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/i,
  );
  if (urlMatch) return urlMatch[1];
  if (/^https?:\/\//i.test(value)) return null;

  const handle = value.startsWith("@") ? value.slice(1) : value;
  return /^[A-Za-z0-9._]+$/.test(handle) ? handle : null;
}
