import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  numeric,
  date,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const collectionSource = pgEnum("collection_source", [
  "manual",
  "discogs_sync",
]);

export const recommendationSource = pgEnum("recommendation_source", [
  "discogs_cooccurrence",
  "lastfm_similar",
]);

// --- Catalog cache (shared across users, sourced from Discogs/Last.fm) ---

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  discogsReleaseId: integer("discogs_release_id").unique(),
  masterId: integer("master_id"),
  title: text("title").notNull(),
  year: integer("year"),
  country: text("country"),
  thumbUrl: text("thumb_url"),
  coverUrl: text("cover_url"),
  formats: jsonb("formats"),
  genres: text("genres").array(),
  styles: text("styles").array(),
  labelName: text("label_name"),
  catalogNumber: text("catalog_number"),
  dataQuality: text("data_quality"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  discogsArtistId: integer("discogs_artist_id").unique(),
  name: text("name").notNull(),
  profile: text("profile"),
  imageUrl: text("image_url"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const releaseArtists = pgTable(
  "release_artists",
  {
    id: serial("id").primaryKey(),
    releaseId: integer("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    artistId: integer("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    role: text("role"),
    joinOrder: integer("join_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("release_artists_release_artist_idx").on(
      table.releaseId,
      table.artistId,
    ),
  ],
);

// --- User data ---

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastfmUsername: text("lastfm_username"),
  preferences: jsonb("preferences"),
});

export const collectionItems = pgTable(
  "collection_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: integer("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "restrict" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rating: integer("rating"),
    notes: text("notes"),
    folder: text("folder"),
    mediaCondition: text("media_condition"),
    sleeveCondition: text("sleeve_condition"),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
    purchaseDate: date("purchase_date"),
    purchaseLocation: text("purchase_location"),
    source: collectionSource("source").notNull().default("manual"),
  },
  (table) => [
    uniqueIndex("collection_items_user_release_idx").on(
      table.userId,
      table.releaseId,
    ),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: integer("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "restrict" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlist_items_user_release_idx").on(
      table.userId,
      table.releaseId,
    ),
  ],
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    releaseId: integer("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "restrict" }),
    score: numeric("score", { precision: 6, scale: 3 }).notNull(),
    source: recommendationSource("source").notNull(),
    reason: text("reason").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dismissed: boolean("dismissed").notNull().default(false),
  },
  (table) => [
    uniqueIndex("recommendations_user_release_idx").on(
      table.userId,
      table.releaseId,
    ),
    index("recommendations_user_dismissed_idx").on(
      table.userId,
      table.dismissed,
    ),
  ],
);

// Last.fm `artist.getSimilar` cache, keyed by artist name (Last.fm has no
// stable numeric id we can rely on across our catalog).
export const artistSimilarity = pgTable(
  "artist_similarity",
  {
    id: serial("id").primaryKey(),
    artistName: text("artist_name").notNull(),
    similarArtistName: text("similar_artist_name").notNull(),
    matchScore: numeric("match_score", { precision: 5, scale: 4 }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("artist_similarity_pair_idx").on(
      table.artistName,
      table.similarArtistName,
    ),
  ],
);

export const userFollows = pgTable(
  "user_follows",
  {
    id: serial("id").primaryKey(),
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingUserId: text("following_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_follows_pair_idx").on(
      table.followerUserId,
      table.followingUserId,
    ),
    index("user_follows_follower_idx").on(table.followerUserId),
    index("user_follows_following_idx").on(table.followingUserId),
  ],
);
