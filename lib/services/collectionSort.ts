export type CollectionSort =
  | "added-desc"
  | "year-desc"
  | "year-asc"
  | "title"
  | "artist"
  | "country";

export const COLLECTION_SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: "added-desc", label: "Recently added" },
  { value: "year-desc", label: "Year (newest)" },
  { value: "year-asc", label: "Year (oldest)" },
  { value: "title", label: "Title (A–Z)" },
  { value: "artist", label: "Artist (A–Z)" },
  { value: "country", label: "Country (A–Z)" },
];

export function parseCollectionSort(value: string | undefined): CollectionSort {
  return COLLECTION_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as CollectionSort)
    : "added-desc";
}
