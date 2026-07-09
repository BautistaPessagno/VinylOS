export type CollectionFilterOptionRow = {
  genres: string[] | null;
  year: number | null;
  labelName: string | null;
};

export type CollectionFilterOptions = {
  genres: string[];
  labels: string[];
  years: number[];
};

function addTrimmed(values: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) values.add(trimmed);
}

function compareText(a: string, b: string) {
  const folded = a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
  if (folded !== 0) return folded;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function buildCollectionFilterOptions(
  rows: CollectionFilterOptionRow[],
): CollectionFilterOptions {
  const genres = new Set<string>();
  const labels = new Set<string>();
  const years = new Set<number>();

  for (const row of rows) {
    for (const genre of row.genres ?? []) {
      addTrimmed(genres, genre);
    }
    addTrimmed(labels, row.labelName);
    if (row.year != null) years.add(row.year);
  }

  return {
    genres: [...genres].sort(compareText),
    labels: [...labels].sort(compareText),
    years: [...years].sort((a, b) => b - a),
  };
}
