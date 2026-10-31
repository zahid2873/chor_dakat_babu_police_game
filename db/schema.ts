import { pgTable, text, jsonb, boolean, bigint, primaryKey } from "drizzle-orm/pg-core";

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

// Last time each player polled a room; drives online/offline badges and AFK handling
export const roomPresence = pgTable(
  "room_presence",
  {
    roomId: text("room_id").notNull(),
    playerId: text("player_id").notNull(),
    lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.playerId] })]
);
