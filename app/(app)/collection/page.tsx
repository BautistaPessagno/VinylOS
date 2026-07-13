import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import {
  listCollectionFilterOptions,
  listCollectionItems,
  parseCollectionSort,
} from "@/lib/services/collectionService";
import { CollectionFiltersForm } from "./CollectionFiltersForm";
import { removeItemAction } from "./actions";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    year?: string;
    label?: string;
    sort?: string;
  }>;
}) {
  const session = await requireSession();
  const { genre, year, label, sort } = await searchParams;
  const selectedFilters = {
    genre: genre?.trim() || undefined,
    year: year?.trim() || undefined,
    label: label?.trim() || undefined,
    sort: parseCollectionSort(sort),
  };
  const selectedYear = selectedFilters.year ? Number(selectedFilters.year) : undefined;

  const [items, filterOptions] = await Promise.all([
    listCollectionItems(session.user.id, {
      genre: selectedFilters.genre,
      year: Number.isFinite(selectedYear) ? selectedYear : undefined,
      label: selectedFilters.label,
      sort: selectedFilters.sort,
    }),
    listCollectionFilterOptions(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your collection</h1>
        <Link
          href="/collection/add"
          className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + Add a record
        </Link>
      </div>

      <CollectionFiltersForm selected={selectedFilters} options={filterOptions} />

      {items.length === 0 ? (
        <p className="text-zinc-500">
          No records yet.{" "}
          <Link href="/collection/add" className="underline">
            Add your first one.
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.itemId}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3"
            >
              <Link
                href={`/album/${item.releaseId}?from=/collection`}
                className="aspect-square w-full overflow-hidden rounded bg-zinc-100"
              >
                {item.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-col">
                <Link
                  href={`/album/${item.releaseId}?from=/collection`}
                  className="truncate font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <span className="truncate text-sm text-zinc-500">
                  {item.artistNames.join(", ")}
                </span>
                <span className="text-xs text-zinc-400">
                  {item.year} {item.labelName ? `· ${item.labelName}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link href={`/collection/${item.itemId}/edit`} className="underline">
                  Edit
                </Link>
                <form action={removeItemAction}>
                  <input type="hidden" name="itemId" value={item.itemId} />
                  <button type="submit" className="text-red-600 underline">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
