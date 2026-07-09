CREATE TYPE "public"."recommendation_source" AS ENUM('discogs_cooccurrence', 'lastfm_similar');--> statement-breakpoint
CREATE TABLE "artist_similarity" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_name" text NOT NULL,
	"similar_artist_name" text NOT NULL,
	"match_score" numeric(5, 4),
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"release_id" integer NOT NULL,
	"score" numeric(6, 3) NOT NULL,
	"source" "recommendation_source" NOT NULL,
	"reason" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artist_similarity_pair_idx" ON "artist_similarity" USING btree ("artist_name","similar_artist_name");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendations_user_release_idx" ON "recommendations" USING btree ("user_id","release_id");--> statement-breakpoint
CREATE INDEX "recommendations_user_dismissed_idx" ON "recommendations" USING btree ("user_id","dismissed");