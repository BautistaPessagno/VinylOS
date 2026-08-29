import { foldName } from "./normalize";
import type { StoreEntry } from "./storeFile";

export const MATCH_RADIUS_METERS = 150;
export const MATCH_NAME_THRESHOLD = 0.6;

export type Point = { lat: number; lng: number };
export type MatchCandidate = Point & { name: string; osmId?: string | null };

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function bigrams(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) out.push(value.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice over character bigrams. 1 = identical, 0 = nothing in common. */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.length === 0 || right.length === 0) return 0;

  const pool = new Map<string, number>();
  for (const gram of left) pool.set(gram, (pool.get(gram) ?? 0) + 1);

  let shared = 0;
  for (const gram of right) {
    const count = pool.get(gram) ?? 0;
    if (count > 0) {
      shared += 1;
      pool.set(gram, count - 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

/**
 * Is this OSM element already in the curated file?
 *
 * Advisory only — a miss costs one redundant suggestion in the candidate file,
 * never a corrupt row, which is why fuzzy matching is acceptable here. Proximity
 * alone is deliberately insufficient: BVM Records and Liverpool Discos are two
 * different shops 18 m apart.
 */
export function findExistingStore(
  candidate: MatchCandidate,
  entries: StoreEntry[],
): StoreEntry | null {
  if (candidate.osmId) {
    const byId = entries.find((entry) => entry.osmId === candidate.osmId);
    if (byId) return byId;
  }

  const folded = foldName(candidate.name);
  for (const entry of entries) {
    if (haversineMeters(candidate, entry) > MATCH_RADIUS_METERS) continue;
    if (diceCoefficient(folded, foldName(entry.name)) >= MATCH_NAME_THRESHOLD) {
      return entry;
    }
  }
  return null;
}
