import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth-session";
import { listPublicCollectionItems } from "@/lib/services/collectionService";
import { listWishlistItems } from "@/lib/services/wishlistService";
import {
  getFollowStatus,
  getPublicUserProfile,
} from "@/lib/services/friendService";
import { getWrappedStats } from "@/lib/services/wrappedService";
import { followUserAction, unfollowUserAction } from "../../friends/actions";
import { addReleaseToWishlistAction } from "../../wishlist/actions";
import { SettingsForm } from "../../settings/SettingsForm";
import { PasswordForm } from "../../settings/PasswordForm";
import { DeleteAccountSection } from "../../settings/DeleteAccountSection";
import { WrappedSection } from "./WrappedSection";
import { SubmitButton } from "../../SubmitButton";

// Deduped across generateMetadata and the page render within one request.
const getProfileCached = cache(getPublicUserProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getProfileCached(userId);
  if (!profile) return { title: "Profile not found" };

  const title = profile.handle ? `${profile.name} (@${profile.handle})` : profile.name;
  const description = `${profile.name}'s vinyl collection on VinylOS.`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

function FollowForm({
  userId,
  returnTo,
  isFollowing,
}: {
  userId: string;
  returnTo: string;
  isFollowing: boolean;
}) {
  const action = isFollowing ? unfollowUserAction : followUserAction;
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton
        pendingText={isFollowing ? "Unfollowing…" : "Following…"}
        className={
          isFollowing
            ? "min-h-11 rounded border border-zinc-300 px-4 py-2 text-sm active:bg-zinc-100 sm:min-h-0 dark:border-zinc-700 dark:active:bg-zinc-800"
            : "min-h-11 rounded bg-black px-4 py-2 text-sm text-white active:bg-zinc-800 sm:min-h-0 dark:bg-white dark:text-black dark:active:bg-zinc-200"
        }
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </SubmitButton>
    </form>
  );
}

type ProfileTab = { key: string; label: string; href: string };

function ProfileTabs({ tabs, active }: { tabs: ProfileTab[]; active: string }) {
  return (
    <nav className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px border-b-2 border-red-500 px-1 pb-2 pt-2 text-sm font-medium text-red-500"
                : "-mb-px border-b-2 border-transparent px-1 pb-2 pt-2 text-sm text-zinc-600 hover:text-red-500 active:text-red-500 dark:text-zinc-300"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Collection and wishlist items share this shape (see listPublicCollectionItems /
// listWishlistItems), so one grid renders both tabs.
type ReleaseGridItem = Awaited<ReturnType<typeof listWishlistItems>>[number];

function ReleaseGrid({
  items,
  returnTo,
  showWishlistAction,
}: {
  items: ReleaseGridItem[];
  returnTo: string;
  showWishlistAction: boolean;
}) {
  const albumHref = (releaseId: number) =>
    `/album/${releaseId}?from=${encodeURIComponent(returnTo)}`;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.itemId}
          className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <Link
            href={albumHref(item.releaseId)}
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
              href={albumHref(item.releaseId)}
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
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          {showWishlistAction && (
            <form action={addReleaseToWishlistAction} className="mt-auto text-sm">
              <input type="hidden" name="releaseId" value={item.releaseId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton
                pendingText="Adding…"
                className="-mx-2 min-h-11 px-2 underline active:opacity-70"
              >
                Wishlist
              </SubmitButton>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession();
  const { userId } = await params;
  const { view } = await searchParams;
  const profile = await getProfileCached(userId);
  if (!profile) notFound();

  const [followStatus, items] = await Promise.all([
    getFollowStatus(session.user.id, profile.id),
    listPublicCollectionItems(profile.id),
  ]);
  const isSelf = followStatus.isSelf;
  const showSettings = isSelf && view === "settings";
  const showWishlist = !isSelf && view === "wishlist";
  const wishlistItems =
    showWishlist && followStatus.isFollowing
      ? await listWishlistItems(profile.id)
      : [];
  const wrapped = isSelf && !showSettings ? await getWrappedStats(profile.id) : null;
  const username = session.user.username ?? session.user.displayUsername ?? "";
  let hasPassword = false;
  if (showSettings) {
    const accounts = await auth.api.listUserAccounts({ headers: await headers() });
    hasPassword = accounts.some((account) => account.providerId === "credential");
  }
  const returnTo = `/users/${profile.id}`;
  const wishlistReturnTo = `/users/${profile.id}?view=wishlist`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <Link href="/friends" className="text-sm text-zinc-500 underline">
            Friends
          </Link>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          {profile.handle && (
            <p className="text-sm text-zinc-500">@{profile.handle}</p>
          )}
          <div className="mt-2 flex gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
              {items.length} {items.length === 1 ? "record" : "records"}
            </span>
            {followStatus.followsYou && (
              <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">Follows you</span>
            )}
          </div>
        </div>
        {!followStatus.isSelf && (
          <FollowForm
            userId={profile.id}
            returnTo={returnTo}
            isFollowing={followStatus.isFollowing}
          />
        )}
      </div>

      {isSelf ? (
        <ProfileTabs
          tabs={[
            { key: "profile", label: "Profile", href: `/users/${profile.id}` },
            {
              key: "settings",
              label: "Settings",
              href: `/users/${profile.id}?view=settings`,
            },
          ]}
          active={showSettings ? "settings" : "profile"}
        />
      ) : (
        <ProfileTabs
          tabs={[
            { key: "collection", label: "Collection", href: `/users/${profile.id}` },
            {
              key: "wishlist",
              label: "Wishlist",
              href: `/users/${profile.id}?view=wishlist`,
            },
          ]}
          active={showWishlist ? "wishlist" : "collection"}
        />
      )}

      {showSettings ? (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
          <SettingsForm
            name={session.user.name}
            username={username}
            email={session.user.email}
          />
          {hasPassword && <PasswordForm />}
          <DeleteAccountSection username={username} />
        </div>
      ) : showWishlist ? (
        followStatus.isFollowing ? (
          wishlistItems.length === 0 ? (
            <p className="text-zinc-500">Nothing on this wishlist yet.</p>
          ) : (
            <ReleaseGrid
              items={wishlistItems}
              returnTo={wishlistReturnTo}
              showWishlistAction
            />
          )
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-zinc-500">
              Follow {profile.name} to see their wishlist.
            </p>
            <FollowForm
              userId={profile.id}
              returnTo={wishlistReturnTo}
              isFollowing={followStatus.isFollowing}
            />
          </div>
        )
      ) : (
        <>
          {wrapped && <WrappedSection stats={wrapped} />}

          {items.length === 0 ? (
            <p className="text-zinc-500">No public records yet.</p>
          ) : (
            <ReleaseGrid
              items={items}
              returnTo={returnTo}
              showWishlistAction={!isSelf}
            />
          )}
        </>
      )}
    </div>
  );
}
