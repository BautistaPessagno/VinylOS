import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { listCollectionItems } from "@/lib/services/collectionService";
import { removeItemAction } from "./actions";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; year?: string; label?: string }>;
}) {
  const session = await requireSession();
  const { genre, year, label } = await searchParams;

  const items = await listCollectionItems(session.user.id, {
    genre,
    year: year ? Number(year) : undefined,
    label,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your collection</h1>
        <Link href="/collection/add" className="rounded bg-black px-4 py-2 text-white">
          Add a record
        </Link>
      </div>

      <form className="flex flex-wrap gap-2 text-sm" action="/collection">
        <input
          name="genre"
          defaultValue={genre}
          placeholder="Genre"
          className="rounded border border-zinc-300 px-3 py-1.5"
        />
        <input
          name="year"
          defaultValue={year}
          placeholder="Year"
          type="number"
          className="rounded border border-zinc-300 px-3 py-1.5"
        />
        <input
          name="label"
          defaultValue={label}
          placeholder="Label"
          className="rounded border border-zinc-300 px-3 py-1.5"
        />
        <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5">
          Filter
        </button>
        {(genre || year || label) && (
          <Link href="/collection" className="px-3 py-1.5 text-zinc-500 underline">
            Clear
          </Link>
        )}
      </form>

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
              <div className="aspect-square w-full overflow-hidden rounded bg-zinc-100">
                {item.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="truncate font-medium">{item.title}</span>
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
