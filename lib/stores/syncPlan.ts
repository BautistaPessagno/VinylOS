import { instagramHandle, normalizePhone, slugify, uniqueSlug } from "./normalize";
import type { StoreEntry } from "./storeFile";

export type StoreRow = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  province: string;
  postalCode: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  openingHours: string | null;
  tags: string[];
};

export type ExistingRow = StoreRow & { active: boolean };

const COMPARED_FIELDS = [
  "name",
  "addressLine",
  "neighborhood",
  "city",
  "province",
  "postalCode",
  "lat",
  "lng",
  "phone",
  "website",
  "instagram",
  "email",
  "openingHours",
] as const;

export function toStoreRows(entries: StoreEntry[]): StoreRow[] {
  const taken = new Set<string>();
  return entries.map((entry) => {
    const slug = uniqueSlug(slugify(entry.name, entry.neighborhood), taken);
    taken.add(slug);
    return {
      slug,
      name: entry.name,
      addressLine: entry.addressLine,
      neighborhood: entry.neighborhood,
      city: entry.city,
      province: entry.province,
      postalCode: entry.postalCode ?? null,
      lat: entry.lat,
      lng: entry.lng,
      phone: normalizePhone(entry.phone),
      website: entry.website ?? null,
      instagram: instagramHandle(entry.instagram),
      email: entry.email ?? null,
      openingHours: entry.openingHours ?? null,
      tags: entry.tags,
    };
  });
}

function hasChanged(next: StoreRow, current: ExistingRow): boolean {
  if (!current.active) return true;
  if (COMPARED_FIELDS.some((field) => next[field] !== current[field])) return true;
  if (next.tags.length !== current.tags.length) return true;
  return next.tags.some((tag, i) => tag !== current.tags[i]);
}

export function buildSyncPlan(rows: StoreRow[], existing: ExistingRow[]) {
  const bySlug = new Map(existing.map((row) => [row.slug, row]));
  const inserts: StoreRow[] = [];
  const updates: StoreRow[] = [];

  for (const row of rows) {
    const current = bySlug.get(row.slug);
    if (!current) inserts.push(row);
    else if (hasChanged(row, current)) updates.push(row);
  }

  const fileSlugs = new Set(rows.map((row) => row.slug));
  const deactivations = existing
    .filter((row) => row.active && !fileSlugs.has(row.slug))
    .map((row) => row.slug);

  return { inserts, updates, deactivations };
}
