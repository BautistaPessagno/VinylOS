import type { DiscogsArtist } from "./types";

export function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getArtistImageUrl(artist: DiscogsArtist): string {
  const images = artist.images ?? [];
  return images.find((image) => image.type === "primary")?.uri ?? images[0]?.uri ?? "";
}
