import { db } from "@/lib/db/client";
import { stores } from "@/lib/db/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";

const publicColumns = {
  slug: stores.slug,
  name: stores.name,
  addressLine: stores.addressLine,
  neighborhood: stores.neighborhood,
  city: stores.city,
  province: stores.province,
  lat: stores.lat,
  lng: stores.lng,
  phone: stores.phone,
  website: stores.website,
  instagram: stores.instagram,
  openingHours: stores.openingHours,
  tags: stores.tags,
};

export type StoreListItem = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  openingHours: string | null;
  tags: string[] | null;
};

export async function listStores({
  q,
  neighborhood,
}: {
  q?: string;
  neighborhood?: string;
}): Promise<StoreListItem[]> {
  const term = q?.trim();
  const filters = [eq(stores.active, true)];
  if (neighborhood) filters.push(eq(stores.neighborhood, neighborhood));
  if (term) {
    filters.push(
      or(
        ilike(stores.name, `%${term}%`),
        ilike(stores.neighborhood, `%${term}%`),
        ilike(stores.addressLine, `%${term}%`),
      )!,
    );
  }

  return db
    .select(publicColumns)
    .from(stores)
    .where(and(...filters))
    .orderBy(asc(stores.neighborhood), asc(stores.name));
}

export async function listNeighborhoods(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ neighborhood: stores.neighborhood })
    .from(stores)
    .where(eq(stores.active, true))
    .orderBy(asc(stores.neighborhood));
  return rows.map((row) => row.neighborhood);
}

export async function getStoreBySlug(slug: string): Promise<StoreListItem | null> {
  const [store] = await db
    .select(publicColumns)
    .from(stores)
    .where(and(eq(stores.slug, slug), eq(stores.active, true)))
    .limit(1);
  return store ?? null;
}
