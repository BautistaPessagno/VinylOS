import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getOptionalSession } from "@/lib/auth-session";
import { listPublicCollectionItems } from "@/lib/services/collectionService";
import { listWishlistItems } from "@/lib/services/wishlistService";
import {
  getFollowStatus,
  getPublicUserProfile,
  type FollowStatus,
} from "@/lib/services/friendService";
import { getWrappedStats } from "@/lib/services/wrappedService";
import { followUserAction, unfollowUserAction } from "@/app/(app)/friends/actions";
import { addReleaseToWishlistAction } from "@/app/(app)/wishlist/actions";
import { SettingsForm } from "@/app/(app)/settings/SettingsForm";
import { PasswordForm } from "@/app/(app)/settings/PasswordForm";
import { DeleteAccountSection } from "@/app/(app)/settings/DeleteAccountSection";
import { WrappedSection } from "./WrappedSection";
import { SubmitButton } from "@/app/(app)/SubmitButton";

// Deduped across generateMetadata and the page render within one request.
const getProfileCached = cache(getPublicUserProfile);

const ANONYMOUS_FOLLOW_STATUS: FollowStatus = {
  isSelf: false,
  isFollowing: false,
  followsYou: false,
};

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
            ? "min-h-11 rounded border border-room-rule px-4 py-2 text-sm active:bg-room-sunk sm:min-h-0"
            : "min-h-11 rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent active:opacity-90 sm:min-h-0"
        }
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </SubmitButton>
    </form>
  );
}

function SignInCta({ returnTo, label }: { returnTo: string; label: string }) {
  const href = `/login?next=${encodeURIComponent(returnTo)}`;
  return (
    <Link
      href={href}
      className="min-h-11 rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent active:opacity-90 sm:min-h-0"
    >
      {label}
    </Link>
  );
}

type ProfileTab = { key: string; label: string; href: string };

function ProfileTabs({ tabs, active }: { tabs: ProfileTab[]; active: string }) {
  return (
    <nav className="flex gap-6 border-b border-room-rule">
      {tabs.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px border-b-2 border-room-accent px-1 pb-2 pt-2 text-sm font-medium text-room-accent"
                : "-mb-px border-b-2 border-transparent px-1 pb-2 pt-2 text-sm text-room-dim hover:text-room-accent active:text-room-accent"
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
          className="flex flex-col gap-2 rounded border border-room-rule p-3"
        >
          <Link
            href={albumHref(item.releaseId)}
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
              href={albumHref(item.releaseId)}
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
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-room-surface px-2 py-0.5 text-xs text-room-dim"
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
  const session = await getOptionalSession();
  const { userId } = await params;
  const { view } = await searchParams;
  const profile = await getProfileCached(userId);
  if (!profile) notFound();

  const [followStatus, items] = await Promise.all([
    session
      ? getFollowStatus(session.user.id, profile.id)
      : Promise.resolve(ANONYMOUS_FOLLOW_STATUS),
    listPublicCollectionItems(profile.id),
  ]);
  const isSelf = followStatus.isSelf;
  const showSettings = isSelf && view === "settings";
  const showWishlist = !isSelf && view === "wishlist";
  // Wishlist is public like collection; only actions (wishlist a record, follow) need auth.
  const wishlistItems = showWishlist ? await listWishlistItems(profile.id) : [];
  const wrapped = isSelf && !showSettings ? await getWrappedStats(profile.id) : null;
  const username = session
    ? (session.user.username ?? session.user.displayUsername ?? "")
    : "";
  let hasPassword = false;
  if (showSettings && session) {
    const accounts = await auth.api.listUserAccounts({ headers: await headers() });
    hasPassword = accounts.some((account) => account.providerId === "credential");
  }
  const returnTo = `/users/${profile.id}`;
  const wishlistReturnTo = `/users/${profile.id}?view=wishlist`;
  // Wishlist action only for signed-in non-self viewers (server action requires session).
  const showWishlistAction = Boolean(session) && !isSelf;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-room-rule pb-6">
        <div className="flex flex-col gap-1">
          {session ? (
            <Link href="/friends" className="text-sm text-room-dim underline">
              Friends
            </Link>
          ) : null}
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          {profile.handle && (
            <p className="text-sm text-room-dim">@{profile.handle}</p>
          )}
          <div className="mt-2 flex gap-2 text-xs text-room-dim">
            <span className="rounded bg-room-surface px-2 py-1">
              {items.length} {items.length === 1 ? "record" : "records"}
            </span>
            {followStatus.followsYou && (
              <span className="rounded bg-room-surface px-2 py-1">Follows you</span>
            )}
          </div>
        </div>
        {!followStatus.isSelf &&
          (session ? (
            <FollowForm
              userId={profile.id}
              returnTo={returnTo}
              isFollowing={followStatus.isFollowing}
            />
          ) : (
            <SignInCta returnTo={returnTo} label="Log in to follow" />
          ))}
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

      {showSettings && session ? (
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
        wishlistItems.length === 0 ? (
          <p className="text-room-dim">Nothing on this wishlist yet.</p>
        ) : (
          <ReleaseGrid
            items={wishlistItems}
            returnTo={wishlistReturnTo}
            showWishlistAction={showWishlistAction}
          />
        )
      ) : (
        <>
          {wrapped && <WrappedSection stats={wrapped} />}

          {items.length === 0 ? (
            <p className="text-room-dim">No public records yet.</p>
          ) : (
            <ReleaseGrid
              items={items}
              returnTo={returnTo}
              showWishlistAction={showWishlistAction}
            />
          )}
        </>
      )}
    </div>
  );
}
