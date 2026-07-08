import { z } from "zod";

export const discogsSearchResultSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  year: z.string().optional(),
  thumb: z.string().optional(),
  cover_image: z.string().optional(),
  format: z.array(z.string()).optional(),
  label: z.array(z.string()).optional(),
  genre: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
  catno: z.string().optional(),
  country: z.string().optional(),
  master_id: z.number().optional(),
});
export type DiscogsSearchResult = z.infer<typeof discogsSearchResultSchema>;

export const discogsSearchResponseSchema = z.object({
  results: z.array(discogsSearchResultSchema),
});

export const discogsReleaseArtistSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.string().optional(),
});

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
});
export type DiscogsRelease = z.infer<typeof discogsReleaseSchema>;
