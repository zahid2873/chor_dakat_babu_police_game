CREATE TABLE "matchmaking_queue" (
	"player_id" text PRIMARY KEY,
	"name" text NOT NULL,
	"avatar_emoji" text NOT NULL,
	"room_id" text,
	"joined_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" bigint NOT NULL
);
