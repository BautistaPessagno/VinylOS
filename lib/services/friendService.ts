import { db } from "@/lib/db/client";
import { user as users, userFollows } from "@/lib/db/schema";
import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";

export type PublicUserProfile = {
  id: string;
  name: string;
  /** Public handle (`@handle`) shown instead of email. Null for accounts (e.g. legacy Google sign-ins) that haven't set one. */
  handle: string | null;
  image: string | null;
};

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
};

export type UserSearchResult = PublicUserProfile & {
  isFollowing: boolean;
};

export type FollowingUser = PublicUserProfile & {
  followedAt: Date;
};

export type FollowerUser = PublicUserProfile & {
  followedAt: Date;
  isFollowingBack: boolean;
};

export type FollowStatus = {
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
};

const publicUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  displayUsername: users.displayUsername,
  image: users.image,
} as const;

function toPublicUser(row: UserRow): PublicUserProfile {
  return {
    id: row.id,
    name: row.name,
    handle: row.displayUsername ?? row.username,
    image: row.image,
  };
}

export async function searchUsers(
  viewerUserId: string,
  query: string,
): Promise<UserSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const pattern = `%${trimmedQuery}%`;
  const rows = await db
    .select(publicUserColumns)
    .from(users)
    .where(
      and(
        ne(users.id, viewerUserId),
        or(
          ilike(users.name, pattern),
          ilike(users.username, pattern),
          ilike(users.displayUsername, pattern),
        ),
      ),
    )
    .limit(20);

  if (rows.length === 0) return [];

  const userIds = rows.map((row) => row.id);
  const followingRows = await db
    .select({ followingUserId: userFollows.followingUserId })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, viewerUserId),
        inArray(userFollows.followingUserId, userIds),
      ),
    );
  const followingIds = new Set(followingRows.map((row) => row.followingUserId));

  return rows.map((row) => ({
    ...toPublicUser(row),
    isFollowing: followingIds.has(row.id),
  }));
}

export async function followUser(followerUserId: string, followingUserId: string) {
  if (!followingUserId || followerUserId === followingUserId) return;

  await db
    .insert(userFollows)
    .values({ followerUserId, followingUserId })
    .onConflictDoNothing({
      target: [userFollows.followerUserId, userFollows.followingUserId],
    });
}

export async function unfollowUser(followerUserId: string, followingUserId: string) {
  if (!followingUserId || followerUserId === followingUserId) return;

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, followerUserId),
        eq(userFollows.followingUserId, followingUserId),
      ),
    );
}

export async function listFollowing(userId: string): Promise<FollowingUser[]> {
  const rows = await db
    .select({ ...publicUserColumns, followedAt: userFollows.createdAt })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingUserId, users.id))
    .where(eq(userFollows.followerUserId, userId))
    .orderBy(desc(userFollows.createdAt));

  return rows.map((row) => ({
    ...toPublicUser(row),
    followedAt: row.followedAt,
  }));
}

export async function listFollowers(userId: string): Promise<FollowerUser[]> {
  const rows = await db
    .select({ ...publicUserColumns, followedAt: userFollows.createdAt })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerUserId, users.id))
    .where(eq(userFollows.followingUserId, userId))
    .orderBy(desc(userFollows.createdAt));

  if (rows.length === 0) return [];

  const followerIds = rows.map((row) => row.id);
  const followingBackRows = await db
    .select({ followingUserId: userFollows.followingUserId })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, userId),
        inArray(userFollows.followingUserId, followerIds),
      ),
    );
  const followingBackIds = new Set(
    followingBackRows.map((row) => row.followingUserId),
  );

  return rows.map((row) => ({
    ...toPublicUser(row),
    followedAt: row.followedAt,
    isFollowingBack: followingBackIds.has(row.id),
  }));
}

export async function getFollowStatus(
  viewerUserId: string,
  targetUserId: string,
): Promise<FollowStatus> {
  if (viewerUserId === targetUserId) {
    return { isSelf: true, isFollowing: false, followsYou: false };
  }

  const [followingRows, followsYouRows] = await Promise.all([
    db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerUserId, viewerUserId),
          eq(userFollows.followingUserId, targetUserId),
        ),
      )
      .limit(1),
    db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerUserId, targetUserId),
          eq(userFollows.followingUserId, viewerUserId),
        ),
      )
      .limit(1),
  ]);

  return {
    isSelf: false,
    isFollowing: followingRows.length > 0,
    followsYou: followsYouRows.length > 0,
  };
}

export async function getPublicUserProfile(
  userId: string,
): Promise<PublicUserProfile | null> {
  const [profile] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return profile ? toPublicUser(profile) : null;
}
