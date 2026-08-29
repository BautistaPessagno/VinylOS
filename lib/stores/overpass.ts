import { z } from "zod";
import { AMBA_BBOX } from "./storeFile";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export type Bbox = typeof AMBA_BBOX;

export type RawStore = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  street: string | null;
  houseNumber: string | null;
  suburb: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
};

export function buildMusicShopQuery(bbox: Bbox): string {
  const area = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  return [
    "[out:json][timeout:90];",
    "(",
    `  node["shop"="music"]${area};`,
    `  way["shop"="music"]${area};`,
    ");",
    "out tags center;",
  ].join("\n");
}

/**
 * Shops of any type whose *name* reads like a record shop. Catches the ones
 * mistagged as shop=electronics, at the cost of dragging in bakeries called
 * "El Record" — so its results are always marked low-confidence for triage.
 */
export function buildNameProbeQuery(bbox: Bbox): string {
  const area = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  return [
    "[out:json][timeout:90];",
    "(",
    `  nwr["shop"]["name"~"disco|disquer|vinil|vinyl|record",i]${area};`,
    ");",
    "out tags center;",
  ].join("\n");
}

const elementSchema = z.object({
  type: z.string(),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

const responseSchema = z.object({ elements: z.array(elementSchema) });

export function toRawStores(response: unknown): RawStore[] {
  const { elements } = responseSchema.parse(response);
  const stores: RawStore[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    // Unnamed or geometry-less elements cannot become directory entries.
    if (!name || lat === undefined || lng === undefined) continue;

    stores.push({
      osmId: `${element.type}/${element.id}`,
      name,
      lat,
      lng,
      street: tags["addr:street"] ?? null,
      houseNumber: tags["addr:housenumber"] ?? null,
      suburb: tags["addr:suburb"] ?? null,
      city: tags["addr:city"] ?? null,
      postcode: tags["addr:postcode"] ?? null,
      phone: tags.phone ?? null,
      website: tags.website ?? null,
      openingHours: tags.opening_hours ?? null,
    });
  }

  return stores;
}

async function runQuery(query: string): Promise<RawStore[]> {
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": process.env.SCRAPER_USER_AGENT ?? "VinylOS/0.1",
    },
  });

  // Overpass sheds load with 429/504 under contention; the caller is a manual
  // script, so surface it plainly rather than retrying in a tight loop.
  if (res.status === 429 || res.status === 504) {
    throw new Error(`Overpass is busy (${res.status}). Wait a minute and re-run.`);
  }
  if (!res.ok) {
    throw new Error(`Overpass error ${res.status}: ${await res.text()}`);
  }
  return toRawStores(await res.json());
}

export async function fetchMusicShops(bbox: Bbox = AMBA_BBOX): Promise<RawStore[]> {
  return runQuery(buildMusicShopQuery(bbox));
}

export async function fetchNameProbe(bbox: Bbox = AMBA_BBOX): Promise<RawStore[]> {
  return runQuery(buildNameProbeQuery(bbox));
}
