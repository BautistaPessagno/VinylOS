ALTER TABLE "artists" ALTER COLUMN "discogs_artist_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "releases" ALTER COLUMN "discogs_release_id" DROP NOT NULL;