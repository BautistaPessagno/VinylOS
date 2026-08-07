import { z } from "zod";

/** Covers CABA plus the 24 partidos of Gran Buenos Aires. Verified against live Overpass. */
export const AMBA_BBOX = {
  south: -34.95,
  west: -58.9,
  north: -34.32,
  east: -58.15,
} as const;

export const STORE_TAGS = ["usados", "nuevos", "tocadiscos", "cafe"] as const;

const optionalText = z.string().trim().min(1).nullish();

export const storeEntrySchema = z.object({
  name: z.string().trim().min(1),
  addressLine: z.string().trim().min(1),
  neighborhood: z.string().trim().min(1),
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: optionalText,
  lat: z.number().gte(AMBA_BBOX.south).lte(AMBA_BBOX.north),
  lng: z.number().gte(AMBA_BBOX.west).lte(AMBA_BBOX.east),
  phone: optionalText,
  website: z.url().nullish(),
  instagram: optionalText,
  email: z.email().nullish(),
  openingHours: optionalText,
  tags: z.array(z.enum(STORE_TAGS)).default([]),
  /** OSM provenance, e.g. "node/4944505488". Absent for shops added by hand. */
  osmId: optionalText,
});

export const storeFileSchema = z.array(storeEntrySchema);

export type StoreEntry = z.infer<typeof storeEntrySchema>;
