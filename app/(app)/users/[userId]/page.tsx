import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { listPublicCollectionItems } from "@/lib/services/collectionService";
import {
  getFollowStatus,
  getPublicUserProfile,
} from "@/lib/services/friendService";
import { followUserAction, unfollowUserAction } from "../../friends/actions";

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
      <button
        type="submit"
        className={
          isFollowing
            ? "rounded border border-zinc-300 px-4 py-2 text-sm"
            : "rounded bg-black px-4 py-2 text-sm text-white"
        }
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </form>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await requireSession();
  const { userId } = await params;
  const profile = await getPublicUserProfile(userId);
  if (!profile) notFound();

  const [followStatus, items] = await Promise.all([
    getFollowStatus(session.user.id, profile.id),
    listPublicCollectionItems(profile.id),
  ]);
  const returnTo = `/users/${profile.id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="flex flex-col gap-1">
          <Link href="/friends" className="text-sm text-zinc-500 underline">
            Friends
          </Link>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          {profile.handle && (
            <p className="text-sm text-zinc-500">@{profile.handle}</p>
          )}
          <div className="mt-2 flex gap-2 text-xs text-zinc-500">
            <span className="rounded bg-zinc-100 px-2 py-1">
              {items.length} {items.length === 1 ? "record" : "records"}
            </span>
            {followStatus.followsYou && (
              <span className="rounded bg-zinc-100 px-2 py-1">Follows you</span>
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

      {items.length === 0 ? (
        <p className="text-zinc-500">No public records yet.</p>
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
              {item.genres && item.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
