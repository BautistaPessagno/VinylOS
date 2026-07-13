import { z } from "zod";

export const discogsSearchResultSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  year: z.string().nullish(),
  thumb: z.string().nullish(),
  cover_image: z.string().nullish(),
  format: z.array(z.string()).nullish(),
  label: z.array(z.string()).nullish(),
  genre: z.array(z.string()).nullish(),
  style: z.array(z.string()).nullish(),
  catno: z.string().nullish(),
  country: z.string().nullish(),
  master_id: z.number().nullish(),
});
export type DiscogsSearchResult = z.infer<typeof discogsSearchResultSchema>;

export const discogsSearchResponseSchema = z.object({
  pagination: z
    .object({
      page: z.number(),
      pages: z.number(),
      per_page: z.number(),
      items: z.number(),
    })
    .optional(),
  results: z.array(discogsSearchResultSchema),
});

export type DiscogsPagination = NonNullable<
  z.infer<typeof discogsSearchResponseSchema>["pagination"]
>;

/**
 * One album, collapsed from all of its vinyl pressings. `releaseId` points at the
 * representative pressing (top Discogs match within the group) used for one-click add.
 */
export type DiscogsAlbumGroup = {
  key: string;
  masterId?: number;
  releaseId: number;
  artist: string;
  title: string;
  coverImage?: string;
  year?: string;
  country?: string;
  genres: string[];
  editionCount: number;
};

export type DiscogsArtistSearchResult = {
  id: number;
  name: string;
  imageUrl?: string;
  thumbUrl?: string;
};

const discogsImageSchema = z.object({
  type: z.string().optional(),
  uri: z.string(),
  uri150: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const discogsArtistSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile: z.string().optional(),
  images: z.array(discogsImageSchema).optional(),
});
export type DiscogsArtist = z.infer<typeof discogsArtistSchema>;

export type DiscogsAlbumPage = {
  albums: DiscogsAlbumGroup[];
  page: number;
  pages: number;
  totalItems: number;
};

export const discogsMasterVersionSchema = z.object({
  id: z.number(),
  title: z.string(),
  format: z.string().optional(),
  label: z.string().optional(),
  catno: z.string().optional(),
  country: z.string().optional(),
  released: z.string().optional(),
  thumb: z.string().optional(),
  major_formats: z.array(z.string()).optional(),
});
export type DiscogsMasterVersion = z.infer<typeof discogsMasterVersionSchema>;

export const discogsMasterVersionsResponseSchema = z.object({
  versions: z.array(discogsMasterVersionSchema),
});

export const discogsReleaseArtistSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.string().optional(),
});

export const discogsTrackSchema = z.object({
  position: z.string().optional(),
  // Discogs' real field name (trailing underscore): "track" | "heading" | "index".
  type_: z.string().optional(),
  title: z.string(),
  duration: z.string().optional(),
});
export type DiscogsTrack = z.infer<typeof discogsTrackSchema>;

export const discogsReleaseSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  country: z.string().optional(),
  genres: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  master_id: z.number().optional(),
  data_quality: z.string().optional(),
  artists: z.array(discogsReleaseArtistSchema).optional(),
  labels: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        catno: z.string().optional(),
      }),
    )
    .optional(),
  formats: z
    .array(
      z.object({
        name: z.string(),
        qty: z.string().optional(),
        descriptions: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  images: z
    .array(
      z.object({
        uri: z.string(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  tracklist: z.array(discogsTrackSchema).optional(),
});
export type DiscogsRelease = z.infer<typeof discogsReleaseSchema>;
