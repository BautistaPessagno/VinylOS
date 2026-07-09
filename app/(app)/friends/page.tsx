import Link from "next/link";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth-session";
import {
  listFollowers,
  listFollowing,
  searchUsers,
  type FollowerUser,
  type FollowingUser,
  type UserSearchResult,
} from "@/lib/services/friendService";
import { followUserAction, unfollowUserAction } from "./actions";
import { InviteFriendsButton } from "./InviteFriendsButton";
import { FriendSearchInput } from "./FriendSearchInput";
import { Avatar } from "../Avatar";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function UserIdentity({
  name,
  handle,
  image,
  detail,
}: {
  name: string;
  handle: string | null;
  image: string | null;
  detail?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} image={image} size="h-10 w-10" textSize="text-sm" />
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {handle && <p className="truncate text-sm text-zinc-500">@{handle}</p>}
        {detail && <p className="text-xs text-zinc-400">{detail}</p>}
      </div>
    </div>
  );
}

function FollowForm({
  userId,
  returnTo,
  label = "Follow",
}: {
  userId: string;
  returnTo: string;
  label?: string;
}) {
  return (
    <form action={followUserAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white">
        {label}
      </button>
    </form>
  );
}

function UnfollowForm({ userId, returnTo }: { userId: string; returnTo: string }) {
  return (
    <form action={unfollowUserAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm">
        Unfollow
      </button>
    </form>
  );
}

function SearchResultRow({
  user,
  returnTo,
}: {
  user: UserSearchResult;
  returnTo: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <UserIdentity name={user.name} handle={user.handle} image={user.image} />
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/users/${user.id}`} className="text-sm underline">
          View collection
        </Link>
        {user.isFollowing ? (
          <UnfollowForm userId={user.id} returnTo={returnTo} />
        ) : (
          <FollowForm userId={user.id} returnTo={returnTo} />
        )}
      </div>
    </li>
  );
}

function FollowingRow({
  user,
  returnTo,
}: {
  user: FollowingUser;
  returnTo: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <UserIdentity
        name={user.name}
        handle={user.handle}
        image={user.image}
        detail={`Following since ${formatDate(user.followedAt)}`}
      />
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/users/${user.id}`} className="text-sm underline">
          View collection
        </Link>
        <UnfollowForm userId={user.id} returnTo={returnTo} />
      </div>
    </li>
  );
}

function FollowerRow({
  user,
  returnTo,
}: {
  user: FollowerUser;
  returnTo: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <UserIdentity
        name={user.name}
        handle={user.handle}
        image={user.image}
        detail={`Followed you on ${formatDate(user.followedAt)}`}
      />
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/users/${user.id}`} className="text-sm underline">
          View collection
        </Link>
        {user.isFollowingBack ? (
          <span className="rounded bg-zinc-100 px-3 py-1.5 text-sm text-zinc-600">
            Following
          </span>
        ) : (
          <FollowForm userId={user.id} returnTo={returnTo} label="Follow back" />
        )}
      </div>
    </li>
  );
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const returnTo = query ? `/friends?q=${encodeURIComponent(query)}` : "/friends";
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const profilePath = `/users/${session.user.id}`;
  const profileUrl = host ? `${protocol}://${host}${profilePath}` : profilePath;

  const [following, followers, searchResults] = await Promise.all([
    listFollowing(session.user.id),
    listFollowers(session.user.id),
    query ? searchUsers(session.user.id, query) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Friends</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Find collectors</h2>
        <form className="flex max-w-2xl gap-2" action="/friends">
          <FriendSearchInput defaultValue={query} />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Search
          </button>
          {query && (
            <Link href="/friends" className="px-3 py-2 text-sm text-zinc-500 underline">
              Clear
            </Link>
          )}
        </form>
        {query && (
          <ul className="flex max-w-3xl flex-col gap-2">
            {searchResults.length === 0 ? (
              <li className="text-sm text-zinc-500">No users found.</li>
            ) : (
              searchResults.map((user) => (
                <SearchResultRow key={user.id} user={user} returnTo={returnTo} />
              ))
            )}
          </ul>
        )}
      </section>

      <section className="flex max-w-3xl flex-col gap-2">
        <InviteFriendsButton profileUrl={profileUrl} />
      </section>

      <section className="flex max-w-3xl flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Following</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {following.length}
          </span>
        </div>
        {following.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
            You&apos;re not following anyone yet. Search for collectors above to follow them.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {following.map((user) => (
              <FollowingRow key={user.id} user={user} returnTo={returnTo} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex max-w-3xl flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Followers</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {followers.length}
          </span>
        </div>
        {followers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
            No followers yet. Share your profile to let others follow you.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {followers.map((user) => (
              <FollowerRow key={user.id} user={user} returnTo={returnTo} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
