CREATE TABLE "room_presence" (
	"room_id" text,
	"player_id" text,
	"last_seen" bigint NOT NULL,
	CONSTRAINT "room_presence_pkey" PRIMARY KEY("room_id","player_id")
);
