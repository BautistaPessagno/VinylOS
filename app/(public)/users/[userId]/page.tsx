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
import { ShareLinkButton } from "@/app/(app)/ShareLinkButton";
import { SubmitButton } from "@/app/(app)/SubmitButton";
import { publicProfilePath, resolveProfileView } from "@/lib/profileView";
import { shareUrlForPath } from "@/lib/shareUrl";

// Deduped across generateMetadata and the page render within one request.
const getProfileCached = cache(getPublicUserProfile);
const listPublicCollectionItemsCached = cache(listPublicCollectionItems);
const listWishlistItemsCached = cache(listWishlistItems);

const ANONYMOUS_FOLLOW_STATUS: FollowStatus = {
  isSelf: false,
  isFollowing: false,
  followsYou: false,
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const { view } = await searchParams;
  const profile = await getProfileCached(userId);
  if (!profile) {
    return { title: "Perfil no encontrado", robots: { index: false, follow: false } };
  }

  const isWishlist = resolveProfileView(view, false) === "wishlist";
  const title = isWishlist
    ? `Lista de deseos de ${profile.name} en VinylOS`
    : profile.handle
      ? `${profile.name} (@${profile.handle})`
      : profile.name;
  const description = isWishlist
    ? `La lista de deseos de vinilos de ${profile.name} en VinylOS.`
    : `La colección de vinilos de ${profile.name} en VinylOS.`;
  const canonical = publicProfilePath(userId, isWishlist ? "wishlist" : "profile");
  const items = isWishlist
    ? await listWishlistItemsCached(profile.id)
    : await listPublicCollectionItemsCached(profile.id);
  const cover = items.find((item) => item.coverUrl)?.coverUrl;
  const images = cover ? [cover] : undefined;

  return {
    title,
    description,
    // Profiles are shareable by link, but a personal collection is not something
    // to publish into search results on the owner's behalf. `follow` still lets
    // crawlers walk through to the album pages, which are meant to be indexed.
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
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
        pendingText={isFollowing ? "Dejando de seguir…" : "Siguiendo…"}
        className={
          isFollowing
            ? "min-h-11 w-full rounded border border-room-rule px-4 py-2 text-sm active:bg-room-sunk sm:min-h-0 sm:w-auto"
            : "min-h-11 w-full rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent active:opacity-90 sm:min-h-0 sm:w-auto"
        }
      >
        {isFollowing ? "Dejar de seguir" : "Seguir"}
      </SubmitButton>
    </form>
  );
}

function SignInCta({ returnTo, label }: { returnTo: string; label: string }) {
  const href = `/login?next=${encodeURIComponent(returnTo)}`;
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent active:opacity-90 sm:min-h-0 sm:w-auto"
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
                pendingText="Añadiendo…"
                className="-mx-2 min-h-11 px-2 underline active:opacity-70"
              >
                Lista de deseos
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
    listPublicCollectionItemsCached(profile.id),
  ]);
  const isSelf = followStatus.isSelf;
  const profileView = resolveProfileView(view, isSelf);
  const showSettings = profileView === "settings";
  const showWishlist = profileView === "wishlist";
  // Wishlist is public like collection; only actions (wishlist a record, follow) need auth.
  const wishlistItems = showWishlist ? await listWishlistItemsCached(profile.id) : [];
  const visibleItems = showWishlist ? wishlistItems : items;
  const wrapped = isSelf && !showSettings && !showWishlist ? await getWrappedStats(profile.id) : null;
  const username = session
    ? (session.user.username ?? session.user.displayUsername ?? "")
    : "";
  let hasPassword = false;
  if (showSettings && session) {
    const accounts = await auth.api.listUserAccounts({ headers: await headers() });
    hasPassword = accounts.some((account) => account.providerId === "credential");
  }
  const returnTo = publicProfilePath(profile.id, "profile");
  const wishlistReturnTo = publicProfilePath(profile.id, "wishlist");
  // Wishlist action only for signed-in non-self viewers (server action requires session).
  const showWishlistAction = Boolean(session) && !isSelf;
  const sharePath = showWishlist ? wishlistReturnTo : returnTo;
  const shareUrl = shareUrlForPath(sharePath, await headers());
  const shareTitle = showWishlist
    ? `Lista de deseos de ${profile.name} en VinylOS`
    : `Colección de ${profile.name} en VinylOS`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-room-rule pb-6">
        <div className="flex flex-col gap-1">
          {session ? (
            <Link href="/friends" className="text-sm text-room-dim underline">
              Amigos
            </Link>
          ) : null}
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          {profile.handle && (
            <p className="text-sm text-room-dim">@{profile.handle}</p>
          )}
          <div className="mt-2 flex gap-2 text-xs text-room-dim">
            <span className="rounded bg-room-surface px-2 py-1">
              {visibleItems.length} {visibleItems.length === 1 ? "record" : "records"}
            </span>
            {followStatus.followsYou && (
              <span className="rounded bg-room-surface px-2 py-1">Te sigue</span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <ShareLinkButton
            url={shareUrl}
            label={showWishlist ? "Compartir lista" : "Compartir colección"}
            title={shareTitle}
            className="min-h-11 w-full rounded-lg border border-room-rule px-4 py-2 text-sm font-medium transition-colors hover:bg-room-sunk active:bg-room-sunk sm:min-h-0 sm:w-fit"
          />
          {!followStatus.isSelf &&
            (session ? (
              <FollowForm
                userId={profile.id}
                returnTo={returnTo}
                isFollowing={followStatus.isFollowing}
              />
            ) : (
              <SignInCta returnTo={returnTo} label="Inicia sesión para seguir" />
            ))}
        </div>
      </div>

      {isSelf && !showWishlist ? (
        <ProfileTabs
          tabs={[
            { key: "profile", label: "Perfil", href: `/users/${profile.id}` },
            {
              key: "settings",
              label: "Ajustes",
              href: `/users/${profile.id}?view=settings`,
            },
          ]}
          active={showSettings ? "settings" : "profile"}
        />
      ) : (
        <ProfileTabs
          tabs={[
            { key: "collection", label: "Colección", href: `/users/${profile.id}` },
            {
              key: "wishlist",
              label: "Lista de deseos",
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
          <p className="text-room-dim">Todavía no hay nada en esta lista de deseos.</p>
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
            <p className="text-room-dim">Todavía no hay discos públicos.</p>
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
