import { z } from "zod";

function csvToList(value?: string) {
  return value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

export const releaseFormSchema = z.object({
  discogsReleaseId: z.coerce.number().int().positive().optional(),
  title: z.string().min(1, "Title is required"),
  artistNames: z
    .string()
    .min(1, "At least one artist is required")
    .transform(csvToList),
  year: z.coerce.number().int().optional(),
  country: z.string().optional(),
  labelName: z.string().optional(),
  catalogNumber: z.string().optional(),
  genres: z.string().optional().transform(csvToList),
  styles: z.string().optional().transform(csvToList),
  coverUrl: z.union([z.literal(""), z.string().url()]).optional(),
  thumbUrl: z.union([z.literal(""), z.string().url()]).optional(),
});
export type ReleaseFormInput = z.input<typeof releaseFormSchema>;
export type ReleaseFormOutput = z.infer<typeof releaseFormSchema>;

export const collectionItemFormSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  folder: z.string().optional(),
  mediaCondition: z.string().optional(),
  sleeveCondition: z.string().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseDate: z.union([z.literal(""), z.iso.date()]).optional(),
  purchaseLocation: z.string().optional(),
});
export type CollectionItemFormInput = z.input<typeof collectionItemFormSchema>;
export type CollectionItemFormOutput = z.infer<typeof collectionItemFormSchema>;
