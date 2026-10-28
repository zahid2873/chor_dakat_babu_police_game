import type { Config } from "@netlify/functions";
import { and, asc, eq, isNull, lt, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { matchmakingQueue, rooms } from "../../db/schema.js";

// Online rooms API — replaces the WebSocket server (server.ts) with stateless
// HTTP endpoints backed by Netlify Database. Clients send actions via POST and
// poll for room state.

type RoleType = "babu" | "police" | "dakat" | "chor";

interface RoomPlayer {
  id: string;
  name: string;
  avatarEmoji: string;
  seatIndex: number;
  isBot: boolean;
  role: RoleType;
  hasSeenChit: boolean;
  currentReaction: string;
  currentDialogue: string;
  scoreHistory: number[];
  totalScore: number;
}

interface GameRoom {
  id: string;
  name: string;
  isPublic: boolean;
  hostPlayerId: string;
  totalRounds: number;
  currentRound: number;
  status: "waiting" | "playing" | "scoreboard" | "finished";
  roundPhase: "unfold" | "babuCall" | "policeSalute" | "interrogation" | "resolved";
  players: RoomPlayer[];
  targetRoleToCatch: "chor" | "dakat";
  babuDeclared: boolean;
  policeDeclared: boolean;
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  createdAt: number;
  updatedAt?: number;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const BOT_NAMES = ["X", "Y", "Z", "W"];
const BOT_EMOJIS = ["👦", "🧔", "👧", "🧑"];
const MATCHMAKING_STALE_MS = 30_000;

const BLUFF_REACTIONS = [
  "ঘাম মুছে স্বাভাবিক থাকার চেষ্টা...",
  "চোখ পিটপিট করে আশেপাশে তাকাচ্ছে...",
  "মুচকি হেসে আত্মবিশ্বাস দেখাচ্ছে...",
  "দারোগার দিকে তাকিয়ে মৃদু কাঁপছে...",
  "গভীর চিন্তায় মগ্ন ভাব দেখাচ্ছে...",
  "একেবারে সাধু সন্ন্যাসীর মতো নিষ্পাপ মুখ!",
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
  dakat: [
    "আমি তো সামান্য নিরীহ পথিক, ডাকাত কোথায় পেলেন? 😅",
    "চোরের মার বড় গলা, পাশের জনের দিকে তাকান! 👀",
    "আমাকে ডাকাত ভাবলে মস্ত ভুল করবেন দারোগা বাবু! 😏",
  ],
  chor: [
    "ভাই আমি নিরীহ ছাত্র! জীবনে একটা মাছিও মারিনি! 🥺",
    "চোরের মার বড় গলা! ওনার চোখের দিকে তাকান! 👀",
    "দারোগা ভাই, আমার পকেট সার্চ করেন, কিচ্ছু নেই! 🏃‍♂️",
    "আমি তো সকাল থেকে স্কুলে অঙ্ক খাতা লিখছি! 📝",
  ],
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function shuffleRoles(): RoleType[] {
  const roles: RoleType[] = ["babu", "police", "dakat", "chor"];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

function dealRound(room: GameRoom) {
  const roles = shuffleRoles();
  room.players.forEach((p, idx) => {
    p.role = roles[idx];
    p.hasSeenChit = p.isBot;
    p.currentReaction = pick(BLUFF_REACTIONS);
    p.currentDialogue = pick(BLUFF_DIALOGUES[p.role]);
  });
  room.babuDeclared = false;
  room.policeDeclared = false;
  room.accusedPlayerId = null;
  room.isCorrectGuess = false;
  room.roundPhase = "unfold";
}

function makePlayer(
  p: { id: string; name?: string; avatarEmoji?: string },
  seatIndex: number,
  isBot = false
): RoomPlayer {
  return {
    id: p.id,
    name: p.name || "আপনি",
    avatarEmoji: p.avatarEmoji || "🧑",
    seatIndex,
    isBot,
    role: "babu",
    hasSeenChit: isBot,
    currentReaction: "",
    currentDialogue: "",
    scoreHistory: [],
    totalScore: 0,
  };
}

function makeBot(roomId: string, idx: number): RoomPlayer {
  return makePlayer({ id: `bot-${roomId}-${idx}`, name: BOT_NAMES[idx - 1], avatarEmoji: BOT_EMOJIS[idx - 1] }, idx, true);
}

function newRoom(id: string, name: string, hostPlayerId: string, players: RoomPlayer[], totalRounds: number, isPublic: boolean): GameRoom {
  return {
    id,
    name,
    isPublic,
    hostPlayerId,
    totalRounds,
    currentRound: 1,
    status: "waiting",
    roundPhase: "unfold",
    players,
    targetRoleToCatch: "chor",
    babuDeclared: false,
    policeDeclared: false,
    accusedPlayerId: null,
    isCorrectGuess: false,
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

const roomState = (room: GameRoom) => Response.json({ type: "ROOM_STATE", room });
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

async function handleAction(data: any): Promise<Response> {
  return db.transaction(async (tx) => {
    switch (data.type) {
      case "CREATE_ROOM": {
        const { roomName, hostPlayer, totalRounds, isPublic, fillWithBots } = data;
        if (!hostPlayer?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const roomId = await generateRoomId(tx);
        const players = [makePlayer(hostPlayer, 0)];
        if (fillWithBots) for (let i = 1; i <= 3; i++) players.push(makeBot(roomId, i));
        const room = newRoom(
          roomId,
          roomName || `${hostPlayer.name}-এর বেঞ্চ`,
          hostPlayer.id,
          players,
          totalRounds || 5,
          isPublic ?? true
        );
        if (fillWithBots) {
          room.status = "playing";
          dealRound(room);
        }
        await insertRoom(tx, room);
        return roomState(room);
      }

      case "JOIN_ROOM": {
        const { player } = data;
        const roomId = String(data.roomId || "").toUpperCase().trim();
        if (!player?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const room = await loadRoomForUpdate(tx, roomId);
        if (!room) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");

        const existing = room.players.find((p) => p.id === player.id);
        if (existing) {
          existing.name = player.name || existing.name;
        } else {
          const botIdx = room.players.findIndex((p) => p.isBot);
          if (botIdx !== -1) {
            const bot = room.players[botIdx];
            room.players[botIdx] = {
              ...makePlayer(player, botIdx),
              role: bot.role,
              scoreHistory: bot.scoreHistory,
              totalScore: bot.totalScore,
            };
          } else if (room.players.length < 4) {
            room.players.push(makePlayer(player, room.players.length));
          } else {
            return errorMsg("এই রুমটি ৪ জন দিয়ে পূর্ণ হয়ে গেছে!");
          }
        }
        await saveRoom(tx, room);
        return roomState(room);
      }

      case "JOIN_MATCHMAKING": {
        const { player } = data;
        if (!player?.id) return errorMsg("প্লেয়ার তথ্য পাওয়া যায়নি!");
        const now = Date.now();

        // Drop stale waiters who stopped polling
        await tx
          .delete(matchmakingQueue)
          .where(and(isNull(matchmakingQueue.roomId), lt(matchmakingQueue.joinedAt, now - MATCHMAKING_STALE_MS)));

        await tx
          .insert(matchmakingQueue)
          .values({ playerId: player.id, name: player.name || "আপনি", avatarEmoji: player.avatarEmoji || "🧑", roomId: null, joinedAt: now })
          .onConflictDoUpdate({
            target: matchmakingQueue.playerId,
            set: { name: player.name || "আপনি", avatarEmoji: player.avatarEmoji || "🧑", roomId: null, joinedAt: now },
          });

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
          const room = newRoom(roomId, "অনলাইন র্যান্ডম ম্যাচ", players[0].id, players, 5, true);
          room.status = "playing";
          dealRound(room);
          await insertRoom(tx, room);
          for (const m of matched) {
            await tx.update(matchmakingQueue).set({ roomId }).where(eq(matchmakingQueue.playerId, m.playerId));
          }
          return roomState(room);
        }

        return Response.json({ type: "MATCHMAKING_STATUS", waitingCount: waiting.length, requiredCount: 4 });
      }

      case "LEAVE_MATCHMAKING": {
        if (data.playerId) await tx.delete(matchmakingQueue).where(eq(matchmakingQueue.playerId, data.playerId));
        return Response.json({ type: "OK" });
      }
    }

    // In-room actions
    const room = await loadRoomForUpdate(tx, String(data.roomId || ""));
    if (!room) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");

    switch (data.type) {
      case "START_GAME":
        while (room.players.length < 4) room.players.push(makeBot(room.id, room.players.length));
        room.status = "playing";
        room.currentRound = 1;
        dealRound(room);
        break;
      case "OPEN_CHIT": {
        const player = room.players.find((p) => p.id === data.playerId);
        if (player) player.hasSeenChit = true;
        break;
      }
      case "BABU_DECLARE":
        room.babuDeclared = true;
        room.roundPhase = "babuCall";
        break;
      case "POLICE_STEP_FORWARD":
        room.policeDeclared = true;
        room.roundPhase = "interrogation";
        break;
      case "SET_TARGET_ROLE":
        if (data.targetRole === "chor" || data.targetRole === "dakat") room.targetRoleToCatch = data.targetRole;
        break;
      case "ACCUSE_SUSPECT": {
        if (room.roundPhase === "resolved") return roomState(room);
        const accused = room.players.find((p) => p.id === data.suspectPlayerId);
        if (!accused) return roomState(room);
        room.accusedPlayerId = accused.id;
        room.isCorrectGuess = accused.role === room.targetRoleToCatch;
        room.roundPhase = "resolved";
        scoreRound(room);
        break;
      }
      case "NEXT_ROUND":
        if (room.roundPhase !== "resolved") return roomState(room);
        if (room.currentRound >= room.totalRounds) {
          room.status = "finished";
        } else {
          room.currentRound += 1;
          dealRound(room);
        }
        break;
      default:
        return errorMsg("Unknown action");
    }

    await saveRoom(tx, room);
    return roomState(room);
  });
}

async function handleState(url: URL): Promise<Response> {
  const playerId = url.searchParams.get("playerId") || "";
  let roomId = (url.searchParams.get("roomId") || "").toUpperCase();

  if (!roomId && playerId) {
    const [entry] = await db.select().from(matchmakingQueue).where(eq(matchmakingQueue.playerId, playerId));
    if (!entry) return Response.json({ type: "NONE" });
    if (!entry.roomId) {
      // Keep this waiter fresh while they poll
      await db.update(matchmakingQueue).set({ joinedAt: Date.now() }).where(eq(matchmakingQueue.playerId, playerId));
      const waiting = await db.select({ id: matchmakingQueue.playerId }).from(matchmakingQueue).where(isNull(matchmakingQueue.roomId));
      return Response.json({ type: "MATCHMAKING_STATUS", waitingCount: waiting.length, requiredCount: 4 });
    }
    roomId = entry.roomId;
    await db.delete(matchmakingQueue).where(eq(matchmakingQueue.playerId, playerId));
  }

  if (!roomId) return Response.json({ type: "NONE" });
  const [row] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!row) return errorMsg("রুম কোড খুঁজে পাওয়া যায়নি!");
  return roomState(row.state as GameRoom);
}

async function handleSearch(url: URL): Promise<Response> {
  const query = (url.searchParams.get("q") || "").toLowerCase().trim();
  const rows = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.isPublic, true), ne(rooms.status, "finished")))
    .limit(200);

  const available = rows
    .map((r) => r.state as GameRoom)
    .filter((r) => !query || r.name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 30)
    .map((r) => ({
      id: r.id,
      name: r.name,
      playersCount: r.players.filter((p) => !p.isBot).length,
      status: r.status,
    }));

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
