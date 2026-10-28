import { pgTable, text, jsonb, boolean, bigint } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: text().primaryKey(),
  name: text().notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  status: text().notNull(),
  state: jsonb().notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const matchmakingQueue = pgTable("matchmaking_queue", {
  playerId: text("player_id").primaryKey(),
  name: text().notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  roomId: text("room_id"),
  joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
});
