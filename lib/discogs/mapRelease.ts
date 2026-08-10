import type { DiscogsRelease } from "@/lib/discogs/types";

/** Maps a fetched Discogs release detail onto the shape `upsertRelease` expects. */
export function releaseInputFromDiscogs(detail: DiscogsRelease) {
  return {
    discogsReleaseId: detail.id,
    masterId: detail.master_id,
    title: detail.title,
    artistNames: detail.artists?.map((a) => a.name) ?? [],
    // Carried through so artists get a Discogs id, which is what /artist/[id]
    // is keyed on — without it their pages are unreachable and unmappable.
    artistRefs: detail.artists?.map((a) => ({ name: a.name, discogsArtistId: a.id })) ?? [],
    year: detail.year,
    country: detail.country,
    labelName: detail.labels?.[0]?.name,
    catalogNumber: detail.labels?.[0]?.catno,
    genres: detail.genres ?? [],
    styles: detail.styles ?? [],
    coverUrl: detail.images?.[0]?.uri ?? "",
    thumbUrl: detail.images?.[0]?.uri ?? "",
  };
}
