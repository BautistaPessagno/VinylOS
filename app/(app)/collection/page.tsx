import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import {
  listCollectionFilterOptions,
  listCollectionItems,
  parseCollectionSort,
} from "@/lib/services/collectionService";
import { CollectionFiltersForm } from "./CollectionFiltersForm";
import { removeItemAction } from "./actions";
import { ConfirmSubmitButton } from "../SubmitButton";

const PAGE_SIZE = 48;

export const metadata = { title: "Collection" };

function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`Rated ${rating} of 5`}
      className="text-xs tracking-tight text-amber-500"
    >
      {"★".repeat(rating)}
      <span className="text-zinc-300 dark:text-zinc-600">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return query ? `/collection?${query}` : "/collection";
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    year?: string;
    label?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const session = await requireSession();
  const { q, genre, year, label, sort, page } = await searchParams;
  const selectedFilters = {
    q: q?.trim() || undefined,
    genre: genre?.trim() || undefined,
    year: year?.trim() || undefined,
    label: label?.trim() || undefined,
    sort: parseCollectionSort(sort),
  };
  const selectedYear = selectedFilters.year ? Number(selectedFilters.year) : undefined;
  const parsedPage = Number(page);
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [{ items, total }, filterOptions] = await Promise.all([
    listCollectionItems(session.user.id, {
      q: selectedFilters.q,
      genre: selectedFilters.genre,
      year: Number.isFinite(selectedYear) ? selectedYear : undefined,
      label: selectedFilters.label,
      sort: selectedFilters.sort,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    listCollectionFilterOptions(session.user.id),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Boolean(
    selectedFilters.q || selectedFilters.genre || selectedFilters.year || selectedFilters.label,
  );
  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: selectedFilters.q,
    genre: selectedFilters.genre,
    year: selectedFilters.year,
    label: selectedFilters.label,
  })) {
    if (value) currentParams.set(key, value);
  }
  if (selectedFilters.sort !== "added-desc") {
    currentParams.set("sort", selectedFilters.sort);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your collection</h1>
        <Link
          href="/collection/add"
          className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
        >
          + Add a record
        </Link>
      </div>

      <CollectionFiltersForm selected={selectedFilters} options={filterOptions} />

      {items.length === 0 ? (
        total > 0 && currentPage > 1 ? (
          <p className="text-zinc-500">
            Nothing on this page.{" "}
            <Link href={pageHref(currentParams, 1)} className="underline">
              Back to the first page.
            </Link>
          </p>
        ) : hasActiveFilters ? (
          <p className="text-zinc-500">
            No records match.{" "}
            <Link href="/collection" className="underline">
              Clear the search and filters.
            </Link>
          </p>
        ) : (
          <p className="text-zinc-500">
            No records yet.{" "}
            <Link href="/collection/add" className="underline">
              Add your first one.
            </Link>
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.itemId}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <Link
                href={`/album/${item.releaseId}?from=/collection`}
                className="aspect-square w-full overflow-hidden rounded bg-zinc-100 active:opacity-80 dark:bg-zinc-800"
              >
                {item.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
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
                {item.rating ? <RatingStars rating={item.rating} /> : null}
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link
                  href={`/collection/${item.itemId}/edit`}
                  className="-mx-2 flex min-h-11 items-center px-2 underline active:opacity-70"
                >
                  Edit
                </Link>
                <form action={removeItemAction}>
                  <input type="hidden" name="itemId" value={item.itemId} />
                  <ConfirmSubmitButton
                    confirmLabel="Really remove?"
                    pendingText="Removing…"
                    className="-mx-2 min-h-11 px-2 text-red-600 underline active:opacity-70"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Collection pages" className="flex items-center justify-center gap-4 text-sm">
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentParams, currentPage - 1)}
              className="flex min-h-11 items-center px-2 underline active:opacity-70"
            >
              ← Previous
            </Link>
          ) : (
            <span className="px-2 text-zinc-400">← Previous</span>
          )}
          <span className="text-zinc-500">
            Page {Math.min(currentPage, pageCount)} of {pageCount}
          </span>
          {currentPage < pageCount ? (
            <Link
              href={pageHref(currentParams, currentPage + 1)}
              className="flex min-h-11 items-center px-2 underline active:opacity-70"
            >
              Next →
            </Link>
          ) : (
            <span className="px-2 text-zinc-400">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
