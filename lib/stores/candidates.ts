import { findExistingStore } from "./match";
import { normalizePhone } from "./normalize";
import type { RawStore } from "./overpass";
import type { StoreEntry } from "./storeFile";

export type Candidate = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  suggestedAddress: string | null;
  suggestedNeighborhood: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  hasFullAddress: boolean;
  /** Came from the name probe rather than shop=music, so it may not be a record shop at all. */
  lowConfidence: boolean;
};

function toCandidate(store: RawStore, lowConfidence: boolean): Candidate {
  const hasFullAddress = Boolean(store.street && store.houseNumber);
  return {
    osmId: store.osmId,
    name: store.name,
    lat: store.lat,
    lng: store.lng,
    suggestedAddress: hasFullAddress ? `${store.street} ${store.houseNumber}` : null,
    suggestedNeighborhood: store.suburb,
    phone: normalizePhone(store.phone),
    website: store.website,
    openingHours: store.openingHours,
    hasFullAddress,
    lowConfidence,
  };
}

/**
 * OSM elements not already represented in the curated file, ordered so the ones
 * needing least manual work come first. Most AMBA entries lack a house number,
 * so an incomplete address is the norm rather than a defect.
 *
 * `probed` results are name-regex hits across all shop types — they surface shops
 * mistagged as something else, but also bakeries called "El Record", so they sort
 * last and carry `lowConfidence`.
 */
export function buildCandidateList(
  tagged: RawStore[],
  probed: RawStore[],
  entries: StoreEntry[],
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const store of tagged) {
    if (findExistingStore(store, entries)) continue;
    seen.add(store.osmId);
    candidates.push(toCandidate(store, false));
  }

  for (const store of probed) {
    // The probe overlaps shop=music heavily; only its exclusive hits are new.
    if (seen.has(store.osmId)) continue;
    if (findExistingStore(store, entries)) continue;
    seen.add(store.osmId);
    candidates.push(toCandidate(store, true));
  }

  return candidates.sort((a, b) => {
    if (a.lowConfidence !== b.lowConfidence) return a.lowConfidence ? 1 : -1;
    if (a.hasFullAddress !== b.hasFullAddress) return a.hasFullAddress ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
