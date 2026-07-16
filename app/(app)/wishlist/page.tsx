import Link from "next/link";
import { requireSession } from "@/lib/auth-session";
import { listWishlistItems } from "@/lib/services/wishlistService";
import { moveToCollectionAction, removeFromWishlistAction } from "./actions";
import { ConfirmSubmitButton, SubmitButton } from "../SubmitButton";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await requireSession();
  const items = await listWishlistItems(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your wishlist</h1>
        <Link
          href="/collection/add"
          className="rounded-lg bg-black px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + Find a record
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-zinc-500">
          Nothing on your wishlist yet.{" "}
          <Link href="/collection/add" className="underline">
            Search for a record to add.
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.itemId}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <Link
                href={`/album/${item.releaseId}?from=/wishlist`}
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
                  href={`/album/${item.releaseId}?from=/wishlist`}
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
              <div className="flex items-center justify-between gap-2 text-sm">
                <form action={moveToCollectionAction}>
                  <input type="hidden" name="itemId" value={item.itemId} />
                  <input type="hidden" name="releaseId" value={item.releaseId} />
                  <SubmitButton
                    pendingText="Moving…"
                    className="-mx-2 min-h-11 px-2 text-left underline active:opacity-70"
                  >
                    Move to collection
                  </SubmitButton>
                </form>
                <form action={removeFromWishlistAction}>
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
    </div>
  );
}
