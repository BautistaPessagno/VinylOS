CREATE TABLE "user_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_user_id" text NOT NULL,
	"following_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_user_id_user_id_fk" FOREIGN KEY ("following_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_pair_idx" ON "user_follows" USING btree ("follower_user_id","following_user_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_idx" ON "user_follows" USING btree ("follower_user_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_user_id");