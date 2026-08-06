import Link from "next/link";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth-session";
import { listWishlistItems } from "@/lib/services/wishlistService";
import { moveToCollectionAction, removeFromWishlistAction } from "./actions";
import { ConfirmSubmitButton, SubmitButton } from "../SubmitButton";
import { ShareLinkButton } from "../ShareLinkButton";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await requireSession();
  const items = await listWishlistItems(session.user.id);
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const sharePath = `/users/${session.user.id}?view=wishlist`;
  const shareUrl = host ? `${protocol}://${host}${sharePath}` : sharePath;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your wishlist</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ShareLinkButton url={shareUrl} label="Share wishlist" title="My wishlist on VinylOS" />
          <Link
            href="/collection/add"
            className="rounded-lg bg-room-accent px-5 py-2.5 text-base font-medium text-room-on-accent shadow-sm transition-colors hover:opacity-90"
          >
            + Find a record
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-room-dim">
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
              className="flex flex-col gap-2 rounded border border-room-rule p-3"
            >
              <Link
                href={`/album/${item.releaseId}?from=/wishlist`}
                className="aspect-square w-full overflow-hidden rounded bg-room-sunk active:opacity-80"
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
                <span className="truncate text-sm text-room-dim">
                  {item.artistNames.join(", ")}
                </span>
                <span className="text-xs text-room-dim">
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
                    className="-mx-2 min-h-11 px-2 text-room-danger underline active:opacity-70"
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
