import { z } from "zod";

export const lastfmArtistInfoSchema = z.object({
  artist: z.object({
    name: z.string(),
    mbid: z.string().optional(),
    bio: z
      .object({
        summary: z.string().optional(),
      })
      .optional(),
  }),
});
export type LastfmArtistInfo = z.infer<typeof lastfmArtistInfoSchema>;
