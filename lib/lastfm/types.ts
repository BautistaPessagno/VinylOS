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

export const lastfmSimilarArtistsSchema = z.object({
  similarartists: z.object({
    artist: z
      .array(
        z.object({
          name: z.string(),
          match: z.coerce.number().optional(),
        }),
      )
      .optional(),
  }),
});
export type LastfmSimilarArtists = z.infer<typeof lastfmSimilarArtistsSchema>;

const lastfmImageSchema = z.object({
  "#text": z.string().optional(),
  size: z.string().optional(),
});

export const lastfmAlbumInfoSchema = z.object({
  album: z.object({
    name: z.string(),
    artist: z.string().optional(),
    image: z.array(lastfmImageSchema).optional(),
    tags: z
      .object({
        tag: z
          .array(z.object({ name: z.string() }))
          .optional(),
      })
      // Last.fm returns "" for tags when there are none.
      .or(z.string())
      .optional(),
    wiki: z
      .object({
        summary: z.string().optional(),
        content: z.string().optional(),
      })
      .optional(),
  }),
});
export type LastfmAlbumInfo = z.infer<typeof lastfmAlbumInfoSchema>;

export const lastfmTopAlbumsSchema = z.object({
  albums: z.object({
    album: z
      .array(
        z.object({
          name: z.string(),
          artist: z.object({ name: z.string() }).optional(),
          image: z.array(lastfmImageSchema).optional(),
        }),
      )
      .optional(),
  }),
});
export type LastfmTopAlbums = z.infer<typeof lastfmTopAlbumsSchema>;

export const lastfmTopTagsSchema = z.object({
  toptags: z.object({
    tag: z
      .array(z.object({ name: z.string() }))
      .optional(),
  }),
});
export type LastfmTopTags = z.infer<typeof lastfmTopTagsSchema>;
