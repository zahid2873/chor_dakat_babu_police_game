import type { Config } from "@netlify/functions";
import { and, asc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { matchmakingQueue, roomPresence, rooms } from "../../db/schema.js";

// Online rooms API: stateless HTTP endpoints backed by Netlify Database.
// Clients POST actions to /api/rooms/action and poll /api/rooms/state.
// Nothing runs between requests, so time-based rules (turn timers, auto next
// round) are applied when any player in the room sends a TICK after a deadline.

type RoleType = "babu" | "police" | "dakat" | "chor";
type Target = "chor" | "dakat";

interface RoomPlayer {
  id: string;
  name: string;
  avatarEmoji: string;
  seatIndex: number;
  isBot: boolean;
  role: RoleType;
  currentDialogue: string;
  scoreHistory: number[];
  totalScore: number;
}

interface Reaction {
  id: string;
  playerId: string;
  text: string;
  at: number;
}

interface GameRoom {
  id: string;
  name: string;
  isPublic: boolean;
  hostPlayerId: string;
  totalRounds: number;
  currentRound: number;
  status: "waiting" | "playing" | "finished";
  roundPhase: "interrogation" | "resolved";
  players: RoomPlayer[];
  targetRoleToCatch: Target;
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  wasAutoAccused?: boolean;
  /** Police must accuse before this; afterwards a TICK accuses for them */
  turnDeadline?: number;
  /** After a verdict, a TICK past this moves to the next round */
  nextRoundAt?: number;
  reactions?: Reaction[];
  createdAt: number;
  updatedAt?: number;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

const BOT_NAMES = ["X", "Y", "Z", "W"];
const BOT_EMOJIS = ["👦", "🧔", "👧", "🧑"];
const ROUND_OPTIONS = [3, 5, 10];
const MATCHMAKING_STALE_MS = 30_000;
const POLICE_TURN_MS = 30_000;
const BOT_TURN_MS = 2_500;
const NEXT_ROUND_MS = 12_000;
const OFFLINE_AFTER_MS = 10_000;
const REACTION_TTL_MS = 6_000;
const REACTION_COOLDOWN_MS = 800;
const ROOM_STALE_MS = 30 * 60_000;
const BOT_POLICE_ACCURACY = 0.35;

// Quick reactions are a fixed list so the room never carries free text.
// Keep in sync with QUICK_REACTIONS in src/utils/constants.ts.
const QUICK_REACTIONS = new Set([
  "😂", "😱", "🤫", "👀", "👏", "🙏", "😎", "🤔",
  "আমি নির্দোষ!", "চোর ধরো!", "দারোগা ভুল করবে!", "হা হা হা!", "জলদি করো!", "সাবাশ!",
]);

const SUSPECT_DIALOGUES = [
  "আমি তো সামান্য নিরীহ পথিক, আমাকে সন্দেহ কেন? 😅",
  "চোরের মার বড় গলা, পাশের জনের দিকে তাকান! 👀",
  "আমাকে ধরলে মস্ত ভুল করবেন দারোগা বাবু! 😏",
  "ভাই আমি নিরীহ ছাত্র! জীবনে একটা মাছিও মারিনি! 🥺",
  "দারোগা ভাই, আমার পকেট সার্চ করেন, কিচ্ছু নেই! 🏃‍♂️",
  "আমি তো সকাল থেকে স্কুলে অঙ্ক খাতা লিখছি! 📝",
];

const BLUFF_DIALOGUES: Record<RoleType, string[]> = {
  babu: [
    "আমি বাবু মশাই! আমার টাকা পয়সা সব সিন্দুকে বন্দি!",
    "দারোগা বাবু! আমার দরবারে চোর-ডাকাতের কোনো স্থান নেই!",
    "কে আমার পুলিশ? সামনে এসে আসামীকে সনাক্ত করো!",
  ],
  police: [
    "হুজুর, আমি আপনার পুলিশ! এক পলকে চোর-ডাকাত ধরে ফেলব!",
    "কারো চোখের দিকে তাকিয়েই আমি বলে দিতে পারি সে অপরাধী কি না!",
    "কাঁপবেন না! সত্যি কথা বলে ফেলুন!",
  ],
  // Chor and Dakat share one pool so a suspect's line never gives their role away
  dakat: SUSPECT_DIALOGUES,
  chor: SUSPECT_DIALOGUES,
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const clean = (s: unknown, max: number, fallback: string) =>
  (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "") || fallback;

function shuffleRoles(): RoleType[] {
  const roles: RoleType[] = ["babu", "police", "dakat", "chor"];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

const policeOf = (room: GameRoom) => room.players.find((p) => p.role === "police")!;

function dealRound(room: GameRoom, now: number) {
  const roles = shuffleRoles();
  room.players.forEach((p, idx) => {
    p.role = roles[idx];
    p.currentDialogue = pick(BLUFF_DIALOGUES[p.role]);
  });
  room.accusedPlayerId = null;
  room.isCorrectGuess = false;
  room.wasAutoAccused = false;
  room.targetRoleToCatch = "dakat";
  room.roundPhase = "interrogation";
  room.turnDeadline = now + (policeOf(room).isBot ? BOT_TURN_MS : POLICE_TURN_MS);
  room.nextRoundAt = undefined;
}

function makePlayer(p: { id: string; name?: unknown; avatarEmoji?: unknown }, seatIndex: number, isBot = false): RoomPlayer {
  return {
    id: String(p.id).slice(0, 64),
    name: clean(p.name, 20, "খেলোয়াড়"),
    avatarEmoji: clean(p.avatarEmoji, 8, "🧑"),
    seatIndex,
    isBot,
    role: "babu",
    currentDialogue: "",
    scoreHistory: [],
    totalScore: 0,
  };
}

function makeBot(roomId: string, idx: number): RoomPlayer {
  const n = (idx + 3) % 4; // seats 1-3 → X, Y, Z; seat 0 → W
  return makePlayer({ id: `bot-${roomId}-${idx}`, name: BOT_NAMES[n], avatarEmoji: BOT_EMOJIS[n] }, idx, true);
}

// Hand a seat to a bot, keeping role and score so the match can carry on
function botTakesSeat(room: GameRoom, idx: number) {
  const leaver = room.players[idx];
  room.players[idx] = {
    ...makeBot(room.id, idx),
    role: leaver.role,
    currentDialogue: leaver.currentDialogue,
    scoreHistory: leaver.scoreHistory,
    totalScore: leaver.totalScore,
  };
  if (leaver.role === "police" && room.roundPhase !== "resolved") {
    room.turnDeadline = Math.min(room.turnDeadline ?? Infinity, Date.now() + BOT_TURN_MS);
  }
}

function newRoom(id: string, name: string, hostPlayerId: string, players: RoomPlayer[], totalRounds: number, isPublic: boolean): GameRoom {
  return {
    id,
    name,
    isPublic,
    hostPlayerId,
    totalRounds: ROUND_OPTIONS.includes(totalRounds) ? totalRounds : 5,
    currentRound: 1,
    status: "waiting",
    roundPhase: "interrogation",
    players,
    targetRoleToCatch: "dakat",
    accusedPlayerId: null,
    isCorrectGuess: false,
    reactions: [],
    createdAt: Date.now(),
  };
}

async function generateRoomId(tx: Tx) {
  for (let i = 0; i < 20; i++) {
    const id = "CP" + Math.floor(1000 + Math.random() * 9000);
    const existing = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, id));
    if (existing.length === 0) return id;
  }
  return "CP" + Date.now().toString().slice(-6);
}

async function insertRoom(tx: Tx, room: GameRoom) {
  room.updatedAt = Date.now();
  await tx.insert(rooms).values({
    id: room.id,
    name: room.name,
    isPublic: room.isPublic,
    status: room.status,
    state: room,
    updatedAt: room.updatedAt,
  });
}

async function saveRoom(tx: Tx, room: GameRoom) {
  room.updatedAt = Date.now();
  await tx
    .update(rooms)
    .set({ name: room.name, status: room.status, state: room, updatedAt: room.updatedAt })
    .where(eq(rooms.id, room.id));
}

async function loadRoomForUpdate(tx: Tx, roomId: string): Promise<GameRoom | null> {
  const [row] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
  return row ? (row.state as GameRoom) : null;
}

async function touchPresence(q: Db, roomId: string, playerId: string, now: number) {
  await q
    .insert(roomPresence)
    .values({ roomId, playerId, lastSeen: now })
    .onConflictDoUpdate({ target: [roomPresence.roomId, roomPresence.playerId], set: { lastSeen: now } });
}

async function onlineIds(q: Db, roomId: string, now: number): Promise<Set<string>> {
  const rows = await q
    .select({ playerId: roomPresence.playerId })
    .from(roomPresence)
    .where(and(eq(roomPresence.roomId, roomId), gt(roomPresence.lastSeen, now - OFFLINE_AFTER_MS)));
  return new Set(rows.map((r) => r.playerId));
}

// What one player is allowed to see: other players' folded Chor/Dakat chits are
// hidden until the verdict, plus presence and the server clock for countdowns.
function viewFor(room: GameRoom, viewerId: string, online: Set<string>, now: number) {
  const masked = room.status === "playing" && room.roundPhase !== "resolved";
  return {
    ...room,
    serverNow: now,
    reactions: (room.reactions || []).filter((r) => r.at > now - REACTION_TTL_MS),
    players: room.players.map((p) => ({
      ...p,
      online: p.isBot || online.has(p.id),
      role: masked && p.id !== viewerId && (p.role === "chor" || p.role === "dakat") ? "hidden" : p.role,
    })),
  };
}

async function roomState(q: Db, room: GameRoom, viewerId: string) {
  const now = Date.now();
  const online = await onlineIds(q, room.id, now);
  return Response.json({ type: "ROOM_STATE", room: viewFor(room, viewerId, online, now) });
}

const errorMsg = (message: string) => Response.json({ type: "ERROR", message });

function scoreRound(room: GameRoom) {
  room.players.forEach((p) => {
    let earned = 0;
    const caught = room.isCorrectGuess && p.id === room.accusedPlayerId;
    if (p.role === "babu") earned = 1000;
    else if (p.role === "police") earned = room.isCorrectGuess ? 500 : 0;
    else if (p.role === "dakat") earned = room.targetRoleToCatch === "dakat" && caught ? 0 : 400;
    else if (p.role === "chor") earned = room.targetRoleToCatch === "chor" && caught ? 0 : 100;
    p.scoreHistory.push(earned);
    p.totalScore += earned;
  });
}

function resolveAccusation(room: GameRoom, accused: RoomPlayer, now: number) {
  room.accusedPlayerId = accused.id;
  room.isCorrectGuess = accused.role === room.targetRoleToCatch;
  room.roundPhase = "resolved";
  room.turnDeadline = undefined;
  room.nextRoundAt = now + NEXT_ROUND_MS;
  scoreRound(room);
}

// Police ran out of time (or is a bot / went offline): accuse on their behalf
function autoAccuse(room: GameRoom, now: number) {
  const police = policeOf(room);
  if (!police.isBot) room.wasAutoAccused = true;
  room.targetRoleToCatch = Math.random() < 0.5 ? "chor" : "dakat";
  const target = room.players.find((p) => p.role === room.targetRoleToCatch)!;
  const other = room.players.find((p) => (p.role === "chor" || p.role === "dakat") && p !== target)!;
  const accuracy = police.isBot ? BOT_POLICE_ACCURACY : 0.5;
  resolveAccusation(room, Math.random() < accuracy ? target : other, now);
}

function advanceRound(room: GameRoom, now: number) {
  if (room.currentRound >= room.totalRounds) {
    room.status = "finished";
    room.nextRoundAt = undefined;
  } else {
    room.currentRound += 1;
    dealRound(room, now);
  }
}

function startMatch(room: GameRoom, now: number) {
  room.status = "playing";
  room.currentRound = 1;
  room.players.forEach((p) => {
    p.scoreHistory = [];
    p.totalScore = 0;
  });
  dealRound(room, now);
}

async function handleAction(data: any): Promise<Response> {
  const viewerId = String(data.playerId || "").slice(0, 64);
  const now = Date.now();

  return db.transaction(async (tx) => {
    const reply = (room: GameRoom) => roomState(tx, room, viewerId);

    switch (data.type) {
      case "CREATE_ROOM": {
        const { hostPlayer, totalRounds, isPublic, fillWithBots } = data;
        if (!hostPlayer?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const roomId = await generateRoomId(tx);
        const host = makePlayer(hostPlayer, 0);
        const players = [host];
        if (fillWithBots) for (let i = 1; i <= 3; i++) players.push(makeBot(roomId, i));
        const room = newRoom(roomId, clean(data.roomName, 30, `${host.name}-এর বেঞ্চ`), host.id, players, Number(totalRounds), isPublic ?? true);
        if (fillWithBots) startMatch(room, now);
        await insertRoom(tx, room);
        await touchPresence(tx, roomId, host.id, now);
        return reply(room);
      }

      case "JOIN_ROOM": {
        const { player } = data;
        const roomId = String(data.roomId || "").toUpperCase().trim();
        if (!player?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const room = await loadRoomForUpdate(tx, roomId);
        if (!room) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");

        const existing = room.players.find((p) => p.id === player.id);
        if (existing) {
          existing.name = clean(player.name, 20, existing.name);
          existing.avatarEmoji = clean(player.avatarEmoji, 8, existing.avatarEmoji);
        } else if (room.status === "finished") {
          return errorMsg("এই রুমের খেলা শেষ হয়ে গেছে!");
        } else {
          const botIdx = room.players.findIndex((p) => p.isBot);
          if (botIdx !== -1) {
            // Take over a bot's seat mid-game, keeping its role and score
            const bot = room.players[botIdx];
            room.players[botIdx] = {
              ...makePlayer(player, botIdx),
              role: bot.role,
              currentDialogue: bot.currentDialogue,
              scoreHistory: bot.scoreHistory,
              totalScore: bot.totalScore,
            };
            if (bot.role === "police" && room.roundPhase !== "resolved") room.turnDeadline = now + POLICE_TURN_MS;
          } else if (room.players.length < 4) {
            room.players.push(makePlayer(player, room.players.length));
          } else {
            return errorMsg("এই রুমটি ৪ জন দিয়ে পূর্ণ হয়ে গেছে!");
          }
        }
        await touchPresence(tx, room.id, String(player.id), now);
        await saveRoom(tx, room);
        return reply(room);
      }

      case "JOIN_MATCHMAKING": {
        const { player } = data;
        if (!player?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const name = clean(player.name, 20, "খেলোয়াড়");
        const avatarEmoji = clean(player.avatarEmoji, 8, "🧑");

        // Drop stale waiters who stopped polling
        await tx
          .delete(matchmakingQueue)
          .where(and(isNull(matchmakingQueue.roomId), lt(matchmakingQueue.joinedAt, now - MATCHMAKING_STALE_MS)));

        await tx
          .insert(matchmakingQueue)
          .values({ playerId: player.id, name, avatarEmoji, roomId: null, joinedAt: now })
          .onConflictDoUpdate({ target: matchmakingQueue.playerId, set: { name, avatarEmoji, roomId: null, joinedAt: now } });

        const waiting = await tx
          .select()
          .from(matchmakingQueue)
          .where(isNull(matchmakingQueue.roomId))
          .orderBy(asc(matchmakingQueue.joinedAt))
          .for("update");

        if (waiting.length >= 4) {
          const matched = waiting.slice(0, 4);
          const roomId = await generateRoomId(tx);
          const players = matched.map((m, idx) => makePlayer({ id: m.playerId, name: m.name, avatarEmoji: m.avatarEmoji }, idx));
          const room = newRoom(roomId, "অনলাইন র্যান্ডম ম্যাচ", players[0].id, players, 5, false);
          startMatch(room, now);
          await insertRoom(tx, room);
          for (const m of matched) {
            await tx.update(matchmakingQueue).set({ roomId }).where(eq(matchmakingQueue.playerId, m.playerId));
            await touchPresence(tx, roomId, m.playerId, now);
          }
          return reply(room);
        }

        return Response.json({ type: "MATCHMAKING_STATUS", waitingCount: waiting.length, requiredCount: 4 });
      }

      case "LEAVE_MATCHMAKING": {
        if (viewerId) await tx.delete(matchmakingQueue).where(eq(matchmakingQueue.playerId, viewerId));
        return Response.json({ type: "OK" });
      }
    }

    // In-room actions: only seated humans may act
    const room = await loadRoomForUpdate(tx, String(data.roomId || ""));
    if (!room) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");
    const me = room.players.find((p) => p.id === viewerId && !p.isBot);
    if (!me) return reply(room);
    await touchPresence(tx, room.id, me.id, now);

    const police = room.players.find((p) => p.role === "police");
    const isPoliceTurn = room.status === "playing" && room.roundPhase !== "resolved";
    const online = await onlineIds(tx, room.id, now);

    switch (data.type) {
      case "START_GAME": {
        // The host starts; if the host has gone quiet, anyone may
        const hostAway = !online.has(room.hostPlayerId);
        if (room.status !== "waiting" || (me.id !== room.hostPlayerId && !hostAway)) return reply(room);
        // Seats of people who closed the tab go to bots instead of stalling turns
        room.players = room.players.filter((p) => p.id === me.id || online.has(p.id));
        room.players.forEach((p, i) => (p.seatIndex = i));
        while (room.players.length < 4) room.players.push(makeBot(room.id, room.players.length));
        room.hostPlayerId = me.id === room.hostPlayerId || hostAway ? me.id : room.hostPlayerId;
        startMatch(room, now);
        break;
      }
      case "SET_TARGET_ROLE":
        if (!isPoliceTurn || police?.id !== me.id) return reply(room);
        if (data.targetRole === "chor" || data.targetRole === "dakat") room.targetRoleToCatch = data.targetRole;
        break;
      case "ACCUSE_SUSPECT": {
        // Only the human police may accuse, and only Chor/Dakat seats
        if (!isPoliceTurn || police?.id !== me.id) return reply(room);
        const accused = room.players.find(
          (p) => p.id === data.suspectPlayerId && (p.role === "chor" || p.role === "dakat")
        );
        if (!accused) return reply(room);
        if (data.targetRole === "chor" || data.targetRole === "dakat") room.targetRoleToCatch = data.targetRole;
        resolveAccusation(room, accused, now);
        break;
      }
      case "TICK": {
        // Apply whatever deadline has passed; harmless if sent early or twice
        if (room.status !== "playing") return reply(room);
        if (room.roundPhase !== "resolved") {
          const policeAway = police && !police.isBot && !online.has(police.id) && now > (room.turnDeadline ?? 0) - POLICE_TURN_MS + OFFLINE_AFTER_MS;
          if (now >= (room.turnDeadline ?? 0) || policeAway) autoAccuse(room, now);
          else return reply(room);
        } else if (now >= (room.nextRoundAt ?? 0)) {
          advanceRound(room, now);
        } else {
          return reply(room);
        }
        break;
      }
      case "NEXT_ROUND":
        if (room.status !== "playing" || room.roundPhase !== "resolved") return reply(room);
        advanceRound(room, now);
        break;
      case "REMATCH":
        if (room.status !== "finished") return reply(room);
        startMatch(room, now);
        break;
      case "REACT": {
        const text = String(data.text || "");
        if (!QUICK_REACTIONS.has(text)) return reply(room);
        const recent = (room.reactions || []).filter((r) => r.at > now - REACTION_TTL_MS);
        if (recent.some((r) => r.playerId === me.id && r.at > now - REACTION_COOLDOWN_MS)) return reply(room);
        room.reactions = [...recent.slice(-11), { id: `${now}-${me.id}`, playerId: me.id, text, at: now }];
        break;
      }
      case "LEAVE_ROOM": {
        const idx = room.players.indexOf(me);
        await tx.delete(roomPresence).where(and(eq(roomPresence.roomId, room.id), eq(roomPresence.playerId, me.id)));
        if (room.status === "waiting") {
          room.players.splice(idx, 1);
          room.players.forEach((p, i) => (p.seatIndex = i));
          if (room.players.length === 0) room.status = "finished";
          else if (room.hostPlayerId === me.id) room.hostPlayerId = room.players[0].id;
        } else if (room.status === "playing") {
          botTakesSeat(room, idx);
          if (!room.players.some((p) => !p.isBot)) room.status = "finished";
        }
        break;
      }
      default:
        return errorMsg("Unknown action");
    }

    await saveRoom(tx, room);
    return reply(room);
  });
}

async function handleState(url: URL): Promise<Response> {
  const playerId = (url.searchParams.get("playerId") || "").slice(0, 64);
  let roomId = (url.searchParams.get("roomId") || "").toUpperCase();
  const now = Date.now();

  if (!roomId && playerId) {
    const [entry] = await db.select().from(matchmakingQueue).where(eq(matchmakingQueue.playerId, playerId));
    if (!entry) return Response.json({ type: "NONE" });
    if (!entry.roomId) {
      // Keep this waiter fresh while they poll
      await db.update(matchmakingQueue).set({ joinedAt: now }).where(eq(matchmakingQueue.playerId, playerId));
      const waiting = await db.select({ id: matchmakingQueue.playerId }).from(matchmakingQueue).where(isNull(matchmakingQueue.roomId));
      return Response.json({ type: "MATCHMAKING_STATUS", waitingCount: waiting.length, requiredCount: 4 });
    }
    roomId = entry.roomId;
    await db.delete(matchmakingQueue).where(eq(matchmakingQueue.playerId, playerId));
  }

  if (!roomId) return Response.json({ type: "NONE" });
  const [row] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!row) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");
  const room = row.state as GameRoom;
  if (room.players.some((p) => p.id === playerId && !p.isBot)) await touchPresence(db, roomId, playerId, now);
  return roomState(db, room, playerId);
}

async function handleSearch(url: URL): Promise<Response> {
  const query = (url.searchParams.get("q") || "").toLowerCase().trim();
  const now = Date.now();
  const rows = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.isPublic, true), ne(rooms.status, "finished"), gt(rooms.updatedAt, now - ROOM_STALE_MS)))
    .limit(200);

  const available = rows
    .map((r) => r.state as GameRoom)
    .filter((r) => !query || r.name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query))
    .map((r) => {
      const humans = r.players.filter((p) => !p.isBot).length;
      // Joinable while there's an empty seat or a bot to replace
      const canJoin = r.status === "waiting" ? r.players.length < 4 : humans < 4;
      return { id: r.id, name: r.name, playersCount: humans, status: r.status, totalRounds: r.totalRounds, currentRound: r.currentRound, canJoin, updatedAt: r.updatedAt || 0 };
    })
    .sort((a, b) => Number(b.canJoin) - Number(a.canJoin) || Number(a.status !== "waiting") - Number(b.status !== "waiting") || b.updatedAt - a.updatedAt)
    .slice(0, 30);

  return Response.json({ rooms: available });
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/rooms\/?/, "");

  try {
    if (req.method === "GET" && route === "search") return await handleSearch(url);
    if (req.method === "GET" && route === "state") return await handleState(url);
    if (req.method === "POST" && route === "action") return await handleAction(await req.json());
    return new Response("Not found", { status: 404 });
  } catch (err) {
    console.error("Rooms API error:", err);
    return Response.json({ type: "ERROR", message: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন!" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/rooms/*",
};
