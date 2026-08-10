export type CollectionSort =
  | "added-desc"
  | "year-desc"
  | "year-asc"
  | "title"
  | "artist"
  | "country"
  | "rating-desc";

export const COLLECTION_SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: "added-desc", label: "Añadidos recientemente" },
  { value: "year-desc", label: "Año (más nuevo)" },
  { value: "year-asc", label: "Año (más antiguo)" },
  { value: "title", label: "Título (A–Z)" },
  { value: "artist", label: "Artista (A–Z)" },
  { value: "country", label: "País (A–Z)" },
  { value: "rating-desc", label: "Valoración (mayor)" },
];

export function parseCollectionSort(value: string | undefined): CollectionSort {
  return COLLECTION_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as CollectionSort)
    : "added-desc";
}
